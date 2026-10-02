import { nextRandom, normalizeSeed } from '../core/random'

export const scenarioDefinitions = {
  success: 'Normal responses and persistent registration.',
  empty: 'Reset demo data to start with no records.',
  'multi-page': 'Reset demo data to create 25 comparable records.',
  slow: 'Responses take 2 seconds.',
  'variable-latency': 'Seeded response delays between 100 and 1500 ms.',
  'out-of-order': 'Alternating reads take 2000 ms and 100 ms.',
  timeout: 'Requests exceed the 5-second timeout without committing.',
  'connection-failure': 'Requests fail without an HTTP response.',
  'http-4xx': 'Requests return HTTP 400 without committing.',
  'http-5xx': 'Requests return HTTP 503 without committing.',
  'ranking-failure': 'Ranking fails; history and registration stay available.',
  'history-failure': 'History fails; ranking and registration stay available.',
  'submit-timeout-after-commit': 'First registration commits, but its response exceeds the timeout.',
  'offline-at-match-end': 'Registration is unavailable until Recover connection is selected.',
} as const
export type ScenarioId = keyof typeof scenarioDefinitions
export type Endpoint = 'ranking' | 'history' | 'submission'
export function isScenarioId(value: string | null): value is ScenarioId { return value !== null && Object.hasOwn(scenarioDefinitions, value) }

export function createScenarioManager(parameters: URLSearchParams) {
  const requested = parameters.get('scenario')
  const requestedSeed = Number(parameters.get('seed') ?? 42)
  const seed = normalizeSeed(Number.isInteger(requestedSeed) && requestedSeed >= 0 && requestedSeed <= 4294967295 ? requestedSeed : 42)
  let snapshot: Readonly<{ id: ScenarioId; revision: number; notice: string | null }> = Object.freeze({ id: isScenarioId(requested) ? requested : 'success', revision: 0,
    notice: requested !== null && !isScenarioId(requested) ? 'Unknown network scenario. Using success.' : null as string | null })
  const listeners = new Set<() => void>()
  let counts: Partial<Record<Endpoint, number>> = {}
  let states: Partial<Record<Endpoint, number>> = {}
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    select(id: ScenarioId) {
      counts = {}; states = {}
      snapshot = Object.freeze({ id, revision: snapshot.revision + 1, notice: null })
      for (const listener of listeners) listener()
    },
    schedule(endpoint: Endpoint) {
      const count = counts[endpoint] ?? 0
      counts[endpoint] = count + 1
      const id = snapshot.id
      let milliseconds = id === 'slow' ? 2000 : id === 'timeout' ? 6000 : 100
      if (id === 'out-of-order' && endpoint !== 'submission') milliseconds = count % 2 === 0 ? 2000 : 100
      if (id === 'variable-latency') {
        const next = nextRandom(states[endpoint] ?? (seed ^ ({ ranking: 11, history: 23, submission: 37 }[endpoint])))
        states[endpoint] = next.state
        milliseconds = 100 + Math.floor(next.value * 1401)
      }
      const networkFailure = id === 'connection-failure' || (id === 'offline-at-match-end' && endpoint === 'submission')
      const status = id === 'http-4xx' ? 400 : id === 'http-5xx' ? 503
        : (id === 'ranking-failure' && endpoint === 'ranking') || (id === 'history-failure' && endpoint === 'history') ? 500 : null
      return { id, revision: snapshot.revision, milliseconds, networkFailure, status, noCommit: id === 'timeout' }
    },
  }
}
export type ScenarioManager = ReturnType<typeof createScenarioManager>
