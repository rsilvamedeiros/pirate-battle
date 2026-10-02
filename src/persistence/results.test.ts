import { describe, expect, it, vi } from 'vitest'
import { configurationKey, parseMatchRecord } from '../api/contracts'
import { defaultGameplayConfig } from '../core/config'
import { createInitialState } from '../core/simulation'
import { createResultsStore, lastResultStorageKey, outboxStorageKey } from './results'

const identity = { playerId: 'local-player', playerName: 'Player' }
const completed = () => ({ ...createInitialState(defaultGameplayConfig), status: 'completed' as const,
  endReason: 'player-death' as const, elapsedMs: 1250.9, score: 3 })

function setup() {
  const data = new Map<string, string>()
  const storage = { getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { data.set(key, value) }) }
  let id = 0
  const createId = vi.fn(() => `match-${++id}`)
  const now = () => `2026-10-02T12:00:0${id}.000Z`
  const boot = () => createResultsStore(storage, identity, createId, now)
  return { data, storage, createId, boot, store: boot() }
}

describe('completed results and durable outbox', () => {
  it('captures a detached record and persists the outbox before the last result', () => {
    const { store, storage } = setup()
    const state = completed()
    const record = store.complete(state)
    expect(record).toMatchObject({ ...identity, matchId: 'match-1', score: 3, durationMs: 1250, endReason: 'player-death' })
    expect(record.config).not.toBe(state.config)
    expect(Object.isFrozen(record.config)).toBe(true)
    expect(storage.setItem.mock.calls.map(([key]) => key)).toEqual([outboxStorageKey, lastResultStorageKey])
    expect(store.getSnapshot().entries['match-1'].attempts).toBe(0)
  })

  it('records the same terminal transition once even after repeated callbacks', () => {
    const { store, createId, storage } = setup()
    const state = completed()
    expect(store.complete(state)).toBe(store.complete(state))
    expect(createId).toHaveBeenCalledTimes(1)
    expect(storage.setItem).toHaveBeenCalledTimes(2)
  })

  it('refuses active or paused matches without creating any pending entry', () => {
    const { store, data, createId } = setup()
    for (const status of ['running', 'paused'] as const) {
      expect(() => store.complete({ ...completed(), status })).toThrow('Only completed matches')
    }
    expect(Object.keys(store.getSnapshot().entries)).toHaveLength(0)
    expect(data.size).toBe(0)
    expect(createId).not.toHaveBeenCalled()
  })

  it('restores multiple pending matches with unchanged identities and payloads', () => {
    const { store, boot } = setup()
    const first = store.complete(completed())
    const second = store.complete(completed())
    const restored = boot().getSnapshot()
    expect(Object.values(restored.entries).map(({ record }) => record)).toEqual([first, second])
    expect(restored.lastResult?.record).toEqual(second)
    expect(restored.lastResult?.submissionStatus).toBe('pending')
  })

  it('retains all in-memory records on failed writes and retries without new identifiers', () => {
    const { store, storage, data, createId } = setup()
    storage.setItem.mockImplementation(() => { throw new Error('Quota exceeded') })
    const first = store.complete(completed())
    store.complete(completed())
    expect(store.getSnapshot().writeFailed).toBe(true)
    expect(data.size).toBe(0)
    storage.setItem.mockImplementation((key, value) => { data.set(key, value) })
    expect(store.retryPersistence()).toBe(true)
    expect(store.getSnapshot().writeFailed).toBe(false)
    expect(store.getSnapshot().entries[first.matchId].record).toBe(first)
    expect(createId).toHaveBeenCalledTimes(2)
    expect(Object.keys(JSON.parse(data.get(outboxStorageKey)!).entries)).toHaveLength(2)
  })

  it('recovers the last result from a durable outbox after a partial write', () => {
    const { store, storage, data, boot } = setup()
    storage.setItem.mockImplementation((key, value) => {
      if (key === lastResultStorageKey) throw new Error('Interrupted')
      data.set(key, value)
    })
    const record = store.complete(completed())
    expect(store.getSnapshot().writeFailed).toBe(true)
    expect(boot().getSnapshot().lastResult?.record).toEqual(record)
  })

  it('recovers the latest queued result when timestamps are equal', () => {
    const { store, data, boot } = setup()
    store.complete(completed())
    const latest = store.complete(completed())
    const outbox = JSON.parse(data.get(outboxStorageKey)!)
    outbox.entries['match-1'].record.playedAt = latest.playedAt
    data.set(outboxStorageKey, JSON.stringify(outbox))
    data.delete(lastResultStorageKey)
    expect(boot().getSnapshot().lastResult?.record).toEqual(latest)
  })

  it('does not overwrite unread pending entries and merges them when storage recovers', () => {
    const { store, storage, boot, data } = setup()
    const previous = store.complete(completed())
    const saved = data.get(outboxStorageKey)
    storage.getItem.mockImplementation((key) => {
      if (key === outboxStorageKey) throw new Error('Read blocked')
      return data.get(key) ?? null
    })
    const recovering = boot()
    const next = recovering.complete(completed())
    expect(data.get(outboxStorageKey)).toBe(saved)
    storage.getItem.mockImplementation((key) => data.get(key) ?? null)
    expect(recovering.retryPersistence()).toBe(true)
    expect(Object.keys(recovering.getSnapshot().entries)).toEqual([previous.matchId, next.matchId])
  })

  it('keeps invalid outbox data intact and reports an explicit recovery problem', () => {
    const { data, boot } = setup()
    data.set(outboxStorageKey, '{invalid')
    data.set(lastResultStorageKey, JSON.stringify({ version: 2 }))
    const store = boot()
    expect(store.getSnapshot().notice).toBeTruthy()
    store.complete(completed())
    expect(store.getSnapshot().writeFailed).toBe(true)
    expect(data.get(outboxStorageKey)).toBe('{invalid')
  })

  it('restores a transient sending status as pending and prioritizes the outbox', () => {
    const { store, data, boot } = setup()
    const record = store.complete(completed())
    for (const submissionStatus of ['sending', 'confirmed']) {
      data.set(lastResultStorageKey, JSON.stringify({ version: 1, record, submissionStatus }))
      expect(boot().getSnapshot().lastResult?.submissionStatus).toBe('pending')
    }
  })

  it('rejects invalid persisted records, bounds and configuration keys', () => {
    const { store } = setup()
    const record = store.complete(completed())
    for (const invalid of [{ ...record, score: -1 }, { ...record, durationMs: 120001 },
      { ...record, playedAt: 'invalid' }, { ...record, endReason: 'abandoned' },
      { ...record, configKey: 'wrong' }, { ...record, config: { ...record.config, sessionTime: 0 } }]) {
      expect(parseMatchRecord(invalid)).toBeNull()
    }
    expect(parseMatchRecord(record)).toEqual(record)
  })

  it('groups configurations by all validated fields independently of property order', () => {
    const reversed = Object.fromEntries(Object.entries(defaultGameplayConfig).reverse()) as typeof defaultGameplayConfig
    expect(configurationKey(reversed)).toBe(configurationKey(defaultGameplayConfig))
    expect(configurationKey({ ...defaultGameplayConfig, frontProjectileDamage: 21 })).not.toBe(configurationKey(defaultGameplayConfig))
  })

  it('publishes stable snapshots and detaches listeners', () => {
    const { store } = setup()
    const initial = store.getSnapshot()
    expect(store.getSnapshot()).toBe(initial)
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    store.complete(completed())
    expect(listener).toHaveBeenCalledTimes(1)
    expect(store.getSnapshot()).not.toBe(initial)
    unsubscribe()
    store.retryPersistence()
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('confirms an older match without overwriting a newer pending result', () => {
    const { store, boot } = setup()
    const old = store.complete(completed())
    const latest = store.complete(completed())
    store.confirm(old)
    expect(store.getSnapshot().lastResult?.record).toBe(latest)
    expect(Object.keys(store.getSnapshot().entries)).toEqual([latest.matchId])
    expect(Object.keys(boot().getSnapshot().entries)).toEqual([latest.matchId])
    store.retryPersistence()
    expect(Object.keys(boot().getSnapshot().entries)).toEqual([latest.matchId])
  })
  it('restores confirmed results after removing the corresponding pending entry', () => {
    const { store, boot } = setup()
    const record = store.complete(completed())
    store.markSending(record.matchId)
    store.confirm(record)
    expect(boot().getSnapshot().lastResult).toEqual({ record, submissionStatus: 'confirmed' })
    expect(boot().getSnapshot().entries).toEqual({})
  })
  it('retains a durable recovery path when confirmation writes fail', () => {
    const { store, storage, boot } = setup()
    const record = store.complete(completed())
    storage.setItem.mockImplementation(() => { throw new Error('Unavailable') })
    store.confirm(record)
    expect(store.getSnapshot().writeFailed).toBe(true)
    expect(boot().getSnapshot().entries[record.matchId].record).toEqual(record)
  })
  it('resets only result keys and preserves unrelated browser data', () => {
    const { store, data, boot } = setup()
    store.complete(completed())
    data.set('unrelated', 'keep')
    expect(store.reset()).toBe(true)
    expect(boot().getSnapshot().lastResult).toBeNull()
    expect(boot().getSnapshot().entries).toEqual({})
    expect(data.get('unrelated')).toBe('keep')
  })
})
