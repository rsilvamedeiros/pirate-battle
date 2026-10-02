import { createMatchRecord, parseMatchRecord } from '../api/contracts'
import type { MatchRecord } from '../api/contracts'
import type { SimulationState } from '../core/simulation'
import type { OptionsStorage } from './options'

export const lastResultStorageKey = 'pirate-battle.last-result.v1'
export const outboxStorageKey = 'pirate-battle.outbox.v1'
export interface LastResult { readonly record: MatchRecord; readonly submissionStatus: 'pending' | 'sending' | 'error' | 'confirmed'; readonly lastError?: string }
export interface OutboxEntry { readonly record: MatchRecord; readonly attempts: number; readonly lastError?: string }
export interface ResultsSnapshot {
  readonly lastResult: LastResult | null
  readonly entries: Readonly<Record<string, OutboxEntry>>
  readonly notice: string | null
  readonly writeFailed: boolean
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readOutbox(storage: OptionsStorage): Record<string, OutboxEntry> {
  const raw = storage.getItem(outboxStorageKey)
  if (raw === null) return {}
  const data: unknown = JSON.parse(raw)
  if (!object(data) || data.version !== 1 || !object(data.entries)) throw new Error('Invalid outbox.')
  const entries: Record<string, OutboxEntry> = Object.create(null)
  for (const [id, value] of Object.entries(data.entries)) {
    if (!object(value)) throw new Error('Invalid outbox entry.')
    const record = parseMatchRecord(value.record)
    if (!record || record.matchId !== id || typeof value.attempts !== 'number'
      || !Number.isSafeInteger(value.attempts) || value.attempts < 0
      || (value.lastError !== undefined && typeof value.lastError !== 'string')) throw new Error('Invalid outbox entry.')
    entries[id] = Object.freeze({ record, attempts: value.attempts,
      ...(typeof value.lastError === 'string' ? { lastError: value.lastError } : {}) })
  }
  return entries
}

function readLastResult(storage: OptionsStorage): LastResult | null {
  const raw = storage.getItem(lastResultStorageKey)
  if (raw === null) return null
  const data: unknown = JSON.parse(raw)
  if (!object(data) || data.version !== 1) throw new Error('Invalid result.')
  if (data.record === null) return null
  const record = parseMatchRecord(data.record)
  if (!record || !['pending', 'sending', 'confirmed', 'error'].includes(String(data.submissionStatus))) throw new Error('Invalid result.')
  return Object.freeze({ record, submissionStatus: data.submissionStatus === 'confirmed' ? 'confirmed' : 'pending' })
}

/** Shell-owned durable queue. No HTTP or gameplay mutation occurs here. */
export function createResultsStore(storage: OptionsStorage, identity: { playerId: string; playerName: string },
  createId: () => string, now: () => string) {
  let entries: Record<string, OutboxEntry> = {}
  let lastResult: LastResult | null = null
  let notice: string | null = null
  let unreadOutbox = false
  const confirmedIds = new Set<string>()
  let submit: (matchId: string) => void = () => {}
  try { entries = readOutbox(storage) } catch {
    unreadOutbox = true
    notice = 'Pending records could not be read. Existing storage has been preserved.'
  }
  try { lastResult = readLastResult(storage) } catch {
    notice = 'The saved result could not be read. Start a new voyage or recover it from pending records.'
  }
  // Recover an interrupted two-key write: the outbox is written first.
  for (const entry of Object.values(entries)) {
    if (!lastResult || entry.record.playedAt >= lastResult.record.playedAt || entry.record.matchId === lastResult.record.matchId) {
      lastResult = Object.freeze({ record: entry.record, submissionStatus: 'pending' })
    }
  }
  let snapshot: ResultsSnapshot = Object.freeze({ lastResult, entries: Object.freeze(entries), notice, writeFailed: false })
  const listeners = new Set<() => void>()
  const completed = new WeakMap<SimulationState, MatchRecord>()

  function publish(writeFailed: boolean) {
    snapshot = Object.freeze({ lastResult, entries: Object.freeze(entries), notice, writeFailed })
    for (const listener of listeners) listener()
  }

  function persist(lastFirst = false): boolean {
    try {
      // Never overwrite unseen pending matches following a read failure.
      const saved = readOutbox(storage)
      unreadOutbox = false
      entries = { ...saved, ...entries }
      for (const id of confirmedIds) delete entries[id]
      if (lastFirst && lastResult) storage.setItem(lastResultStorageKey, JSON.stringify({ version: 1, ...lastResult }))
      storage.setItem(outboxStorageKey, JSON.stringify({ version: 1, entries }))
      if (!lastFirst && lastResult) storage.setItem(lastResultStorageKey, JSON.stringify({ version: 1, ...lastResult }))
      notice = null
      publish(false)
      return true
    } catch {
      notice = unreadOutbox
        ? 'Pending records could not be read. Existing storage has been preserved; new results are kept in memory. Refresh recovery is not guaranteed.'
        : 'The result could not be saved completely. It is kept in memory; refresh recovery is not guaranteed.'
      publish(true)
      return false
    }
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    complete(state: SimulationState): MatchRecord {
      const existing = completed.get(state)
      if (existing) return existing
      if (state.status !== 'completed' || state.endReason === null) throw new Error('Only completed matches have records.')
      const record = createMatchRecord(state, identity, createId(), now())
      completed.set(state, record)
      entries = { ...entries, [record.matchId]: Object.freeze({ record, attempts: 0 }) }
      lastResult = Object.freeze({ record, submissionStatus: 'pending' })
      persist()
      return record
    },
    retryPersistence: () => persist(),
    setSubmissionHandler(handler: (matchId: string) => void) { submit = handler },
    retrySubmission(matchId: string) { submit(matchId) },
    markSending(matchId: string): boolean {
      const entry = entries[matchId]
      if (!entry) return false
      entries = { ...entries, [matchId]: Object.freeze({ record: entry.record, attempts: entry.attempts + 1 }) }
      if (lastResult?.record.matchId === matchId) lastResult = Object.freeze({ record: entry.record, submissionStatus: 'sending' })
      return persist()
    },
    markFailed(matchId: string, lastError: string) {
      const entry = entries[matchId]
      if (!entry) return
      entries = { ...entries, [matchId]: Object.freeze({ ...entry, lastError }) }
      if (lastResult?.record.matchId === matchId) lastResult = Object.freeze({ record: entry.record, submissionStatus: 'error', lastError })
      persist()
    },
    confirm(record: MatchRecord) {
      if (!entries[record.matchId]) return
      confirmedIds.add(record.matchId)
      entries = Object.fromEntries(Object.entries(entries).filter(([id]) => id !== record.matchId))
      if (lastResult?.record.matchId === record.matchId) lastResult = Object.freeze({ record, submissionStatus: 'confirmed' })
      persist(true)
    },
    reset(): boolean {
      try {
        storage.setItem(outboxStorageKey, JSON.stringify({ version: 1, entries: {} }))
        storage.setItem(lastResultStorageKey, JSON.stringify({ version: 1, record: null, submissionStatus: 'pending' }))
        entries = {}; lastResult = null; notice = null; unreadOutbox = false; confirmedIds.clear()
        publish(false)
        return true
      } catch { notice = 'Demo records could not be reset. Browser storage is unavailable.'; publish(true); return false }
    },
  }
}

export type ResultsStore = ReturnType<typeof createResultsStore>
