import { createGameplayConfigSnapshot, validateGameplayConfig } from '../core/config'
import type { GameplayConfig } from '../core/config'
import type { SimulationState } from '../core/simulation'

export interface MatchRecord {
  readonly matchId: string
  readonly playerId: string
  readonly playerName: string
  readonly playedAt: string
  readonly score: number
  readonly durationMs: number
  readonly endReason: 'time-expired' | 'player-death'
  readonly config: Readonly<GameplayConfig>
  readonly configKey: string
}

export function configurationKey(config: Readonly<GameplayConfig>): string {
  const snapshot = createGameplayConfigSnapshot(config)
  return `v1:${JSON.stringify(Object.fromEntries(Object.entries(snapshot).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)))}`
}

export function createMatchRecord(state: SimulationState, identity: { playerId: string; playerName: string },
  matchId: string, playedAt: string): MatchRecord {
  if (state.status !== 'completed' || state.endReason === null) throw new Error('Only completed matches have records.')
  const config = createGameplayConfigSnapshot(state.config)
  return Object.freeze({ matchId, playerId: identity.playerId, playerName: identity.playerName, playedAt, score: state.score,
    durationMs: Math.floor(state.elapsedMs), endReason: state.endReason, config, configKey: configurationKey(config) })
}

/** Validate persisted data before exposing it to the interface or future HTTP layer. */
export function parseMatchRecord(input: unknown): MatchRecord | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const record = input as Record<string, unknown>
  if (['matchId', 'playerId', 'playerName'].some((key) => typeof record[key] !== 'string' || !(record[key] as string).trim())) return null
  if (typeof record.playedAt !== 'string' || !Number.isFinite(Date.parse(record.playedAt))
    || new Date(record.playedAt).toISOString() !== record.playedAt) return null
  if (typeof record.score !== 'number' || !Number.isSafeInteger(record.score) || record.score < 0
    || typeof record.durationMs !== 'number' || !Number.isSafeInteger(record.durationMs) || record.durationMs < 0) return null
  if (record.endReason !== 'time-expired' && record.endReason !== 'player-death') return null
  const validated = validateGameplayConfig(record.config)
  if (!validated.valid || record.durationMs > validated.config.sessionTime * 1000
    || record.configKey !== configurationKey(validated.config)) return null
  return Object.freeze({ matchId: record.matchId as string, playerId: record.playerId as string,
    playerName: record.playerName as string, playedAt: record.playedAt, score: record.score,
    durationMs: record.durationMs, endReason: record.endReason, config: validated.config, configKey: record.configKey as string })
}
