import { MutationObserver } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import axios from 'axios'
import type { ResultsStore } from '../persistence/results'
import type { MatchRecord } from './contracts'
import type { MatchApi } from './client'
import { normalizeApiError, retryDelay, retryRequest } from './client'

const recordQuery = (query: { queryKey: readonly unknown[] }) =>
  query.queryKey[0] === 'ranking' || query.queryKey[0] === 'match-history'
export { recordQuery }

export function createSubmissionCoordinator(
  store: ResultsStore,
  api: MatchApi,
  client: QueryClient,
) {
  let enabled = false
  let generation = 0
  const tried = new Set<string>()
  const inFlight = new Map<string, { controller: AbortController; promise: Promise<void> }>()
  function submit(matchId: string): Promise<void> {
    const current = inFlight.get(matchId)
    if (current) return current.promise
    const entry = store.getSnapshot().entries[matchId]
    if (!enabled || !entry || store.getSnapshot().writeFailed) return Promise.resolve()
    const controller = new AbortController()
    const started = generation
    tried.add(matchId)
    const promise = Promise.resolve().then(async () => {
      const observer = new MutationObserver<MatchRecord, Error, MatchRecord>(client, {
        mutationKey: ['submit-match', matchId],
        networkMode: 'always',
        mutationFn: (record) => {
          if (started !== generation || controller.signal.aborted) throw new axios.CanceledError()
          if (!store.markSending(matchId))
            throw new axios.CanceledError('The pending record could not be saved.')
          return api.submit(record, controller.signal)
        },
        retry: (count, error) =>
          started === generation && !controller.signal.aborted && retryRequest(count, error),
        retryDelay,
      })
      try {
        const record = await observer.mutate(entry.record)
        if (started !== generation) return
        store.confirm(record)
        await client.cancelQueries({ predicate: recordQuery })
        await client.invalidateQueries({ predicate: recordQuery })
      } catch (error) {
        if (started === generation && axios.isCancel(error) && !controller.signal.aborted)
          tried.delete(matchId)
        if (started === generation && !axios.isCancel(error))
          store.markFailed(matchId, normalizeApiError(error).message)
      } finally {
        if (inFlight.get(matchId)?.controller === controller) inFlight.delete(matchId)
      }
    })
    inFlight.set(matchId, { controller, promise })
    return promise
  }
  function replay() {
    if (!enabled || store.getSnapshot().writeFailed) return
    for (const id of Object.keys(store.getSnapshot().entries)) if (!tried.has(id)) void submit(id)
  }
  const unsubscribe = store.subscribe(replay)
  store.setSubmissionHandler((id) => {
    void submit(id)
  })
  return {
    submit,
    start() {
      enabled = true
      replay()
    },
    suspend() {
      enabled = false
      generation++
      tried.clear()
      for (const request of inFlight.values()) request.controller.abort()
      inFlight.clear()
    },
    dispose() {
      this.suspend()
      unsubscribe()
      store.setSubmissionHandler(() => {})
    },
  }
}
