import axios from 'axios'
import { parseMatchRecord } from './contracts'
import type { ApiError, MatchRecord, Paginated, RankingEntry } from './contracts'

export class ApiFailure extends Error {
  readonly code: ApiError['code']
  readonly status?: number
  constructor(code: ApiError['code'], message: string, status?: number) { super(message); this.code = code; this.status = status }
}
export function normalizeApiError(error: unknown): ApiFailure {
  if (error instanceof ApiFailure) return error
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return new ApiFailure('timeout', 'The request timed out. Please retry.')
    const status = error.response?.status
    if (status) {
      const body = error.response?.data as Partial<ApiError> | undefined
      return new ApiFailure(body?.code ?? 'internal-error', body?.message ?? `Request failed (HTTP ${status}).`, status)
    }
  }
  return new ApiFailure('connection-failure', 'Unable to reach match records. Please retry.')
}
export function retryRequest(failureCount: number, error: unknown) {
  if (axios.isCancel(error)) return false
  const failure = normalizeApiError(error)
  return failureCount < 2 && (failure.status === undefined || failure.status === 429 || failure.status >= 500)
}
export const retryDelay = (attempt: number) => (attempt + 1) * 1000

export function createApiClient(baseURL: string) {
  const http = axios.create({ baseURL, timeout: 5000 })
  return {
    async ranking(configKey: string, page: number, signal: AbortSignal): Promise<Paginated<RankingEntry>> {
      try { return (await http.get<Paginated<RankingEntry>>('/ranking', { params: { configKey, page, pageSize: 10 }, signal })).data }
      catch (error) { if (axios.isCancel(error)) throw error; throw normalizeApiError(error) }
    },
    async history(playerId: string, page: number, signal: AbortSignal): Promise<Paginated<MatchRecord>> {
      try { return (await http.get<Paginated<MatchRecord>>(`/players/${encodeURIComponent(playerId)}/matches`, { params: { page, pageSize: 10 }, signal })).data }
      catch (error) { if (axios.isCancel(error)) throw error; throw normalizeApiError(error) }
    },
    async submit(record: MatchRecord, signal: AbortSignal): Promise<MatchRecord> {
      try {
        const response = await http.put(`/matches/${encodeURIComponent(record.matchId)}`, record, { signal })
        const confirmed = parseMatchRecord(response.data)
        if (!confirmed || confirmed.matchId !== record.matchId) throw new ApiFailure('internal-error', 'The registration response was invalid.', 400)
        return confirmed
      } catch (error) { if (axios.isCancel(error)) throw error; throw normalizeApiError(error) }
    },
  }
}
export type MatchApi = ReturnType<typeof createApiClient>
