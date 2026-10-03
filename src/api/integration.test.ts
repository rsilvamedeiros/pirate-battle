import axios from 'axios'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, expect, it } from 'vitest'
import { createHandlers } from '../mocks/handlers'
import { createMockDatabase } from '../mocks/database'
import { createScenarioManager } from '../mocks/scenarios'
import { configurationKey } from './contracts'
import { defaultGameplayConfig } from '../core/config'
import { createApiClient, ApiFailure, normalizeApiError, retryRequest } from './client'

const server = setupServer()
server.listen({ onUnhandledRequest: 'error' })
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
function setup(scenario = 'success', wait: (ms: number) => Promise<void> = async () => {}) {
  const values = new Map<string, string>()
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
  const manager = createScenarioManager(new URLSearchParams(`scenario=${scenario}`))
  const database = createMockDatabase(
    storage,
    { playerId: 'local', playerName: 'Player' },
    manager.getSnapshot().id,
  )
  server.use(...createHandlers(database, manager, wait))
  return { database, manager, api: createApiClient('http://pirate.test/api') }
}

it('uses real Axios/MSW GET contracts with pagination and independent player histories', async () => {
  const { api } = setup('multi-page')
  const signal = new AbortController().signal
  expect(await api.ranking(configurationKey(defaultGameplayConfig), 3, signal)).toMatchObject({
    total: 25,
    totalPages: 3,
    page: 3,
  })
  expect((await api.history('local', 2, signal)).items).toHaveLength(10)
  expect((await api.history('other', 1, signal)).items).toHaveLength(0)
})
it('enforces idempotent PUTs and rejects identifier and configuration mismatches', async () => {
  const { database, api } = setup()
  const record = { ...database.find('fixture-01')!, matchId: 'completed' }
  const signal = new AbortController().signal
  expect(await api.submit(record, signal)).toEqual(record)
  expect(await api.submit({ ...record, score: 999 }, signal)).toEqual(record)
  expect(database.history('local', 1, 50).total).toBe(4)
  await expect(axios.put('http://pirate.test/api/matches/wrong', record)).rejects.toMatchObject({
    response: { status: 400 },
  })
  await expect(
    api.submit({ ...record, matchId: 'invalid', configKey: 'wrong' }, signal),
  ).rejects.toMatchObject({ status: 400 })
  await expect(axios.get('http://pirate.test/api/unknown')).rejects.toMatchObject({
    response: { status: 404, data: { code: 'not-found' } },
  })
})
it('commits before a post-commit timeout and returns the first record on retry', async () => {
  let release!: () => void
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  let entered!: () => void
  const committed = new Promise<void>((resolve) => {
    entered = resolve
  })
  const { database, api } = setup('submit-timeout-after-commit', async (ms) => {
    if (ms === 6000) {
      entered()
      await held
    }
  })
  const record = { ...database.find('fixture-01')!, matchId: 'post-commit' }
  const controller = new AbortController()
  const pending = api.submit(record, controller.signal).then(
    () => null,
    (error: unknown) => error,
  )
  await committed
  expect(database.find(record.matchId)).toEqual(record)
  controller.abort()
  expect(axios.isCancel(await pending)).toBe(true)
  expect(await api.submit(record, new AbortController().signal)).toEqual(record)
  expect(
    database.history('local', 1, 50).items.filter(({ matchId }) => matchId === record.matchId),
  ).toHaveLength(1)
  release()
})
it('does not commit failed or obsolete submissions', async () => {
  let release!: () => void
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  let entered!: () => void
  const started = new Promise<void>((resolve) => {
    entered = resolve
  })
  const { database, api, manager } = setup('slow', async () => {
    entered()
    await held
  })
  const record = { ...database.find('fixture-01')!, matchId: 'obsolete' }
  const request = api.submit(record, new AbortController().signal).then(
    () => null,
    (error: unknown) => error,
  )
  await started
  manager.select('success')
  release()
  expect(await request).toMatchObject({ code: 'connection-failure' })
  expect(database.find(record.matchId)).toBeUndefined()
})
for (const [scenario, status] of [
  ['http-4xx', 400],
  ['http-5xx', 503],
  ['ranking-failure', 500],
] as const) {
  it(`normalizes ${scenario} without confusing errors and empty data`, async () => {
    const { api } = setup(scenario)
    await expect(
      api.ranking(configurationKey(defaultGameplayConfig), 1, new AbortController().signal),
    ).rejects.toMatchObject({ status })
  })
}
it('bounds retry policy and treats cancellation separately from transport failure', () => {
  expect(retryRequest(0, new ApiFailure('validation-error', 'invalid', 400))).toBe(false)
  expect(retryRequest(1, new ApiFailure('unavailable', 'offline', 503))).toBe(true)
  expect(retryRequest(2, new ApiFailure('timeout', 'timeout'))).toBe(false)
  expect(retryRequest(0, new axios.CanceledError())).toBe(false)
  expect(normalizeApiError(new axios.AxiosError('timeout', 'ECONNABORTED')).code).toBe('timeout')
})
