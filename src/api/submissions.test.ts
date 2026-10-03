import { QueryClient } from '@tanstack/react-query'
import { expect, it, vi } from 'vitest'
import { createSubmissionCoordinator } from './submissions'
import { ApiFailure } from './client'
import type { MatchApi } from './client'
import type { MatchRecord } from './contracts'
import { createResultsStore } from '../persistence/results'
import { createInitialState } from '../core/simulation'
import { defaultGameplayConfig } from '../core/config'

function setup() {
  const values = new Map<string, string>()
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
  const store = createResultsStore(
    storage,
    { playerId: 'local', playerName: 'Player' },
    () => 'completed',
    () => '2026-10-02T12:00:00.000Z',
  )
  const record = store.complete({
    ...createInitialState(defaultGameplayConfig),
    status: 'completed',
    endReason: 'player-death',
    elapsedMs: 100,
  })
  const submit = vi.fn<MatchApi['submit']>()
  const api: MatchApi = { ranking: vi.fn(), history: vi.fn(), submit }
  const client = new QueryClient()
  const coordinator = createSubmissionCoordinator(store, api, client)
  return { store, record, submit, client, coordinator }
}
it('waits for worker readiness before dispatching boot entries', async () => {
  const { submit, coordinator } = setup()
  await coordinator.submit('completed')
  expect(submit).not.toHaveBeenCalled()
  coordinator.dispose()
})
it('shares one in-flight mutation and clears a confirmed entry once', async () => {
  const { store, record, submit, client, coordinator } = setup()
  let release!: (record: MatchRecord) => void
  submit.mockImplementation(
    () =>
      new Promise((resolve) => {
        release = resolve
      }),
  )
  coordinator.start()
  const first = coordinator.submit(record.matchId)
  expect(coordinator.submit(record.matchId)).toBe(first)
  await vi.waitFor(() => expect(submit).toHaveBeenCalledTimes(1))
  expect(store.getSnapshot().lastResult?.submissionStatus).toBe('sending')
  expect(store.getSnapshot().entries[record.matchId].attempts).toBe(1)
  release(record)
  await first
  expect(store.getSnapshot().entries).toEqual({})
  expect(store.getSnapshot().lastResult?.submissionStatus).toBe('confirmed')
  expect(client.getMutationCache().getAll()[0].state.status).toBe('success')
  coordinator.dispose()
  client.clear()
})
it('bounds retryable failures to three requests while retaining the same record', async () => {
  vi.useFakeTimers()
  const { store, record, submit, client, coordinator } = setup()
  try {
    submit.mockRejectedValue(new ApiFailure('unavailable', 'offline', 503))
    coordinator.start()
    const pending = coordinator.submit(record.matchId)
    await vi.advanceTimersByTimeAsync(3100)
    await pending
    expect(submit).toHaveBeenCalledTimes(3)
    expect(submit.mock.calls.every(([payload]) => payload === record)).toBe(true)
    expect(store.getSnapshot().entries[record.matchId]).toMatchObject({
      attempts: 3,
      lastError: 'offline',
    })
    expect(store.getSnapshot().lastResult?.submissionStatus).toBe('error')
  } finally {
    coordinator.dispose()
    client.clear()
    vi.useRealTimers()
  }
})
it('does not automatically retry 400 and permits a later explicit retry', async () => {
  const { store, record, submit, client, coordinator } = setup()
  submit
    .mockRejectedValueOnce(new ApiFailure('validation-error', 'rejected', 400))
    .mockResolvedValue(record)
  coordinator.start()
  await coordinator.submit(record.matchId)
  expect(submit).toHaveBeenCalledTimes(1)
  expect(store.getSnapshot().entries[record.matchId].record).toBe(record)
  await coordinator.submit(record.matchId)
  expect(submit).toHaveBeenCalledTimes(2)
  expect(store.getSnapshot().lastResult?.submissionStatus).toBe('confirmed')
  coordinator.dispose()
  client.clear()
})
it('ignores a late mutation acknowledgment after reset even if transport ignores abort', async () => {
  const { store, record, submit, client, coordinator } = setup()
  let release!: (record: MatchRecord) => void
  submit.mockImplementation(
    () =>
      new Promise((resolve) => {
        release = resolve
      }),
  )
  coordinator.start()
  const old = coordinator.submit(record.matchId)
  await vi.waitFor(() => expect(submit).toHaveBeenCalledTimes(1))
  coordinator.suspend()
  store.reset()
  coordinator.start()
  release(record)
  await old
  expect(store.getSnapshot().lastResult).toBeNull()
  expect(store.getSnapshot().entries).toEqual({})
  coordinator.dispose()
  client.clear()
})
it('invalidates both resource caches after confirmation without touching other keys', async () => {
  const { record, submit, client, coordinator } = setup()
  client.setQueryData(['ranking', 'config', 1, 10], { total: 0 })
  client.setQueryData(['match-history', 'local', 1, 10], { total: 0 })
  client.setQueryData(['unrelated'], { keep: true })
  submit.mockResolvedValue(record)
  coordinator.start()
  await coordinator.submit(record.matchId)
  expect(client.getQueryState(['ranking', 'config', 1, 10])?.isInvalidated).toBe(true)
  expect(client.getQueryState(['match-history', 'local', 1, 10])?.isInvalidated).toBe(true)
  expect(client.getQueryState(['unrelated'])?.isInvalidated).toBe(false)
  coordinator.dispose()
  client.clear()
})
