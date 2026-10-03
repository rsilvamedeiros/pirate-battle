import { describe, expect, it } from 'vitest'
import { createMockDatabase, databaseStorageKey } from './database'
import { configurationKey } from '../api/contracts'
import { defaultGameplayConfig } from '../core/config'

const identity = { playerId: 'local', playerName: 'Player' }
const key = configurationKey(defaultGameplayConfig)
function setup(scenario: 'success' | 'multi-page' | 'empty' = 'success') {
  const values = new Map<string, string>()
  const storage = {
    getItem: (id: string) => values.get(id) ?? null,
    setItem: (id: string, value: string) => {
      values.set(id, value)
    },
  }
  return { storage, values, database: createMockDatabase(storage, identity, scenario) }
}
describe('shared confirmed-record database', () => {
  it('seeds other players and paginates absolute ranks and independent history', () => {
    const { database } = setup()
    expect(database.ranking(key, 1, 10)).toMatchObject({ total: 12, totalPages: 2 })
    expect(database.ranking(key, 2, 10).items.map(({ rank }) => rank)).toEqual([11, 12])
    expect(database.history(identity.playerId, 1, 10).total).toBe(3)
    expect(database.history('unknown', 1, 10).totalPages).toBe(0)
  })
  it('creates the multi-page and empty fixture sets only at initialization or reset', () => {
    const { database } = setup('multi-page')
    expect([1, 2, 3].map((page) => database.history('local', page, 10).items.length)).toEqual([
      10, 10, 5,
    ])
    database.reset('empty')
    expect(database.ranking(key, 1, 10).total).toBe(0)
  })
  it('returns the first committed payload unchanged for repeated IDs', () => {
    const { database, storage } = setup('empty')
    const fixture = setup().database.find('fixture-01')!
    const record = { ...fixture, matchId: 'completed' }
    expect(database.commit(record).created).toBe(true)
    expect(database.commit({ ...record, score: 999 })).toEqual({ record, created: false })
    const restored = createMockDatabase(storage, identity, 'success')
    expect(restored.ranking(key, 1, 10).total).toBe(1)
    expect(restored.history('local', 1, 10).items).toEqual([record])
  })
  it('applies every ranking tie breaker and filters the complete configuration', () => {
    const { database } = setup('empty')
    const base = setup().database.find('fixture-01')!
    for (const record of [
      { ...base, matchId: 'b', score: 4, durationMs: 1000, playedAt: '2026-01-01T00:00:00.000Z' },
      { ...base, matchId: 'a', score: 4, durationMs: 1000, playedAt: '2026-01-01T00:00:00.000Z' },
      { ...base, matchId: 'c', score: 4, durationMs: 1000, playedAt: '2026-01-02T00:00:00.000Z' },
      { ...base, matchId: 'd', score: 4, durationMs: 2000 },
      { ...base, matchId: 'e', score: 3, durationMs: 500 },
      {
        ...base,
        matchId: 'f',
        config: { ...base.config, sessionTime: 60 },
        configKey: configurationKey({ ...base.config, sessionTime: 60 }),
      },
    ])
      database.commit(record)
    expect(database.ranking(key, 1, 10).items.map(({ matchId }) => matchId)).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
    ])
    expect(database.history('local', 1, 10).total).toBe(6)
  })
  it('does not acknowledge or expose a record if its durable write fails', () => {
    const { database, storage } = setup('empty')
    storage.setItem = () => {
      throw new Error('Quota exceeded')
    }
    const record = { ...setup().database.find('fixture-01')!, matchId: 'failed' }
    expect(() => database.commit(record)).toThrow()
    expect(database.find('failed')).toBeUndefined()
    expect(database.history('local', 1, 10).total).toBe(0)
  })
  it('refuses malformed saved records without replacing the original storage', () => {
    const { values, storage } = setup()
    values.set(databaseStorageKey, '{invalid')
    expect(() => createMockDatabase(storage, identity, 'success')).toThrow()
    expect(values.get(databaseStorageKey)).toBe('{invalid')
  })
})
