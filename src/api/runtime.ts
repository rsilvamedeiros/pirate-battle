import { QueryClient } from '@tanstack/react-query'
import { createApiClient, retryDelay, retryRequest } from './client'
import { createSubmissionCoordinator, recordQuery } from './submissions'
import { createScenarioManager } from '../mocks/scenarios'
import type { ScenarioId } from '../mocks/scenarios'
import { createMockDatabase, databaseStorageKey } from '../mocks/database'
import type { MockDatabase } from '../mocks/database'
import type { ResultsStore } from '../persistence/results'
import type { PlayerOptions, OptionsStorage } from '../persistence/options'
import { activateWorker } from '../mocks/activate-worker'

export function createDataRuntime(
  store: ResultsStore,
  storage: OptionsStorage,
  identity: PlayerOptions,
) {
  const scenarios = createScenarioManager(new URLSearchParams(location.search))
  const client = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30000, retry: retryRequest, retryDelay, networkMode: 'always' },
    },
  })
  const api = createApiClient(`${import.meta.env.BASE_URL}api`)
  const submissions = createSubmissionCoordinator(store, api, client)
  let database: MockDatabase | undefined
  let worker: import('msw/browser').SetupWorker | undefined
  let starting: Promise<void> | undefined
  let snapshot: Readonly<{
    status: 'loading' | 'ready' | 'error'
    error: string | null
    busy: boolean
  }> = Object.freeze({ status: 'loading', error: null, busy: false })
  const listeners = new Set<() => void>()
  function publish(status: typeof snapshot.status, error: string | null = null, busy = false) {
    snapshot = Object.freeze({ status, error, busy })
    for (const listener of listeners) listener()
  }
  async function start() {
    if (worker) return
    if (starting) return starting
    publish('loading')
    starting = Promise.resolve().then(async () => {
      try {
        database = createMockDatabase(storage, identity, scenarios.getSnapshot().id)
        const workerUrl = `${import.meta.env.BASE_URL}pirate-battle-worker.js`
        await activateWorker(workerUrl)
        // Import MSW only inside the guarded data startup: its cookie store can
        // access localStorage during module evaluation in browser environments.
        const [{ setupWorker }, { createHandlers }] = await Promise.all([
          import('msw/browser'),
          import('../mocks/handlers'),
        ])
        const candidate = setupWorker(...createHandlers(database, scenarios))
        try {
          await candidate.start({
            serviceWorker: { url: workerUrl },
            onUnhandledRequest: 'bypass',
            quiet: true,
          })
        } catch (error) {
          candidate.stop()
          throw error
        }
        worker = candidate
        publish('ready')
        submissions.start()
      } catch (error) {
        publish(
          'error',
          error instanceof Error
            ? error.message
            : 'Match records could not be initialized. You can still play.',
        )
      } finally {
        starting = undefined
      }
    })
    return starting
  }
  async function changeScenario(id: ScenarioId, reset = false) {
    if (snapshot.busy) return
    publish(snapshot.status, null, true)
    submissions.suspend()
    scenarios.select(id) // Invalidates delayed handlers before touching data.
    const url = new URL(location.href)
    url.searchParams.set('scenario', id)
    history.replaceState(null, '', url)
    try {
      await client.cancelQueries({ predicate: recordQuery })
      client.removeQueries({ predicate: recordQuery })
      if (reset) {
        if (!database)
          storage.setItem(
            databaseStorageKey,
            JSON.stringify({ version: 1, records: {}, revision: 0 }),
          )
        database ??= createMockDatabase(storage, identity, id)
        database.reset(id)
        if (!store.reset())
          throw new Error('Pending records could not be reset. Restore storage access and retry.')
      }
      publish(worker ? 'ready' : 'error')
      if (worker) submissions.start()
      else await start()
    } catch (error) {
      publish(
        worker ? 'ready' : 'error',
        error instanceof Error ? error.message : 'The network scenario could not be changed.',
      )
    }
  }
  return {
    client,
    api,
    scenarios,
    submissions,
    start,
    changeScenario,
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
export type DataRuntime = ReturnType<typeof createDataRuntime>
