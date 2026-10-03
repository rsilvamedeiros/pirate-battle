import { configurationKey, parseMatchRecord } from '../api/contracts'
import type { MatchRecord, Paginated, RankingEntry } from '../api/contracts'
import { defaultGameplayConfig } from '../core/config'
import type { OptionsStorage } from '../persistence/options'
import type { ScenarioId } from './scenarios'

export const databaseStorageKey = 'pirate-battle.msw-db.v1'
export const lexical = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
export const compareRanking = (a: MatchRecord, b: MatchRecord) =>
  b.score - a.score ||
  a.durationMs - b.durationMs ||
  lexical(a.playedAt, b.playedAt) ||
  lexical(a.matchId, b.matchId)

export function createFixtures(
  scenario: ScenarioId,
  identity: { playerId: string; playerName: string },
): MatchRecord[] {
  const count = scenario === 'empty' ? 0 : scenario === 'multi-page' ? 25 : 12
  return Array.from({ length: count }, (_, index) => ({
    matchId: `fixture-${String(index + 1).padStart(2, '0')}`,
    playerId:
      scenario === 'multi-page' || index < 3 ? identity.playerId : `fixture-player-${index}`,
    playerName:
      scenario === 'multi-page' || index < 3
        ? identity.playerName
        : ['Blackbeard', 'Anne Bonny', 'Calico Jack'][index % 3],
    playedAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    score: count - index,
    durationMs: 60000 + index * 100,
    endReason: 'player-death',
    config: { ...defaultGameplayConfig },
    configKey: configurationKey(defaultGameplayConfig),
  }))
}

function paginate<T>(items: T[], page: number, pageSize: number): Paginated<T> {
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    page,
    pageSize,
    total: items.length,
    totalPages: Math.ceil(items.length / pageSize),
  }
}

export function createMockDatabase(
  storage: OptionsStorage,
  identity: { playerId: string; playerName: string },
  scenario: ScenarioId,
) {
  let records: Record<string, MatchRecord> = Object.create(null)
  let revision = 0
  const raw = storage.getItem(databaseStorageKey)
  if (raw !== null) {
    const data: unknown = JSON.parse(raw)
    if (
      !data ||
      typeof data !== 'object' ||
      !('version' in data) ||
      data.version !== 1 ||
      !('records' in data) ||
      !data.records ||
      typeof data.records !== 'object' ||
      Array.isArray(data.records)
    )
      throw new Error('Saved demo database is invalid. Reset demo data to recover.')
    for (const [id, input] of Object.entries(data.records)) {
      const record = parseMatchRecord(input)
      if (!record || record.matchId !== id)
        throw new Error('Saved demo database is invalid. Reset demo data to recover.')
      records[id] = record
    }
    if ('revision' in data && typeof data.revision === 'number') revision = data.revision
  } else {
    records = Object.fromEntries(
      createFixtures(scenario, identity).map((record) => [record.matchId, record]),
    )
    // Fixtures may be viewed with blocked writes; actual commits must persist.
    try {
      write(records, revision)
    } catch {
      /* A PUT will report persistence failure. */
    }
  }
  function write(next: Record<string, MatchRecord>, nextRevision: number) {
    storage.setItem(
      databaseStorageKey,
      JSON.stringify({
        version: 1,
        records: next,
        revision: nextRevision,
        fixturePlayers: [
          ...new Set(
            Object.values(next)
              .filter(({ matchId }) => matchId.startsWith('fixture-'))
              .map(({ playerId }) => playerId),
          ),
        ],
      }),
    )
  }
  return {
    find: (id: string) => (Object.hasOwn(records, id) ? records[id] : undefined),
    commit(record: MatchRecord) {
      const existing = Object.hasOwn(records, record.matchId) ? records[record.matchId] : undefined
      if (existing) return { record: existing, created: false }
      const next = { ...records, [record.matchId]: record }
      write(next, revision + 1)
      records = next
      revision++
      return { record, created: true }
    },
    ranking(configKey: string, page: number, pageSize: number): Paginated<RankingEntry> {
      const entries = Object.values(records)
        .filter((record) => record.configKey === configKey)
        .sort(compareRanking)
        .map((record, index) => ({
          rank: index + 1,
          matchId: record.matchId,
          playerId: record.playerId,
          playerName: record.playerName,
          score: record.score,
          durationMs: record.durationMs,
          playedAt: record.playedAt,
          configKey,
        }))
      return paginate(entries, page, pageSize)
    },
    history(playerId: string, page: number, pageSize: number) {
      return paginate(
        Object.values(records)
          .filter((record) => record.playerId === playerId)
          .sort((a, b) => lexical(b.playedAt, a.playedAt) || lexical(a.matchId, b.matchId)),
        page,
        pageSize,
      )
    },
    reset(id: ScenarioId) {
      const next = Object.fromEntries(
        createFixtures(id, identity).map((record) => [record.matchId, record]),
      )
      write(next, revision + 1)
      records = next
      revision++
    },
  }
}
export type MockDatabase = ReturnType<typeof createMockDatabase>
