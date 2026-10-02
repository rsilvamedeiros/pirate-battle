import { delay, http, HttpResponse } from 'msw'
import { parseMatchRecord } from '../api/contracts'
import type { ApiError, MatchRecord, Paginated, RankingEntry } from '../api/contracts'
import type { MockDatabase } from './database'
import type { Endpoint, ScenarioManager } from './scenarios'

export function createHandlers(database: MockDatabase, scenarios: ScenarioManager,
  wait: (milliseconds: number) => Promise<void> = delay) {
  function error(status: number, message: string) {
    return HttpResponse.json<ApiError>({ code: status === 400 ? 'validation-error' : status === 503 ? 'unavailable' : 'internal-error', message }, { status })
  }
  function pagination(request: Request) {
    const parameters = new URL(request.url).searchParams
    const page = Number(parameters.get('page') ?? 1)
    const pageSize = Number(parameters.get('pageSize') ?? 10)
    return Number.isSafeInteger(page) && page >= 1 && Number.isSafeInteger(pageSize) && pageSize >= 1 && pageSize <= 50 ? { page, pageSize } : null
  }
  async function read(request: Request, endpoint: Endpoint, data: Paginated<RankingEntry> | Paginated<MatchRecord>) {
    const schedule = scenarios.schedule(endpoint)
    await wait(schedule.milliseconds)
    if (scenarios.getSnapshot().revision !== schedule.revision || request.signal.aborted) return HttpResponse.error()
    if (schedule.networkFailure) return HttpResponse.error()
    if (schedule.status) return error(schedule.status, 'The selected network scenario rejected this request.')
    return HttpResponse.json(data)
  }
  return [
    http.get('*/api/ranking', ({ request }) => {
      const paging = pagination(request)
      const key = new URL(request.url).searchParams.get('configKey')
      if (!paging || !key) return error(400, 'Valid pagination and configKey are required.')
      return read(request, 'ranking', database.ranking(key, paging.page, paging.pageSize))
    }),
    http.get('*/api/players/:playerId/matches', ({ request, params }) => {
      const paging = pagination(request)
      if (!paging) return error(400, 'Valid pagination is required.')
      return read(request, 'history', database.history(String(params.playerId), paging.page, paging.pageSize))
    }),
    http.put('*/api/matches/:matchId', async ({ request, params }) => {
      let body: unknown
      try { body = await request.json() } catch { return error(400, 'A JSON match record is required.') }
      if (!body || typeof body !== 'object' || !('matchId' in body) || body.matchId !== params.matchId) return error(400, 'Path and body match identifiers must agree.')
      const existing = database.find(String(params.matchId))
      const record = existing ?? parseMatchRecord(body)
      if (!record) return error(400, 'The match payload is invalid.')
      const schedule = scenarios.schedule('submission')
      const postCommitTimeout = schedule.id === 'submit-timeout-after-commit' && !existing
      if (!postCommitTimeout) await wait(schedule.milliseconds)
      if (schedule.revision !== scenarios.getSnapshot().revision || request.signal.aborted) return HttpResponse.error()
      if (schedule.networkFailure) return HttpResponse.error()
      if (schedule.status) return error(schedule.status, 'The selected network scenario rejected registration.')
      if (schedule.noCommit) return error(503, 'Registration timed out without committing.')
      try {
        const confirmed = database.commit(record)
        if (postCommitTimeout) await wait(6000)
        if (schedule.revision !== scenarios.getSnapshot().revision) return HttpResponse.error()
        return HttpResponse.json(confirmed.record, { status: confirmed.created ? 201 : 200 })
      } catch { return error(500, 'The demo record could not be persisted. Retry when browser storage is available.') }
    }),
    http.all('*/api/*', () => HttpResponse.json<ApiError>({ code: 'not-found', message: 'The requested API route does not exist.' }, { status: 404 })),
  ]
}
