import { useQuery } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import type { DataRuntime } from '../api/runtime'
import type { MatchRecord, Paginated, RankingEntry } from '../api/contracts'
import { normalizeApiError } from '../api/client'

interface Props { runtime: DataRuntime; kind: 'ranking' | 'history'; playerId: string; configKey: string; page: number; onPage(page: number): void }
export function RecordsPanel({ runtime, kind, playerId, configKey, page, onPage }: Props) {
  const network = useSyncExternalStore(runtime.subscribe, runtime.getSnapshot)
  const query = useQuery<Paginated<MatchRecord | RankingEntry>>({
    queryKey: kind === 'ranking' ? ['ranking', configKey, page, 10] : ['match-history', playerId, page, 10],
    queryFn: ({ signal }) => kind === 'ranking' ? runtime.api.ranking(configKey, page, signal) : runtime.api.history(playerId, page, signal),
    enabled: network.status === 'ready' && !network.busy,
    refetchOnMount: 'always',
  })
  const data = query.data
  return <section className="records-panel" role="tabpanel" aria-labelledby={`${kind}-tab`} id={`${kind}-panel`}>
    <h2>{kind === 'ranking' ? 'Ranking' : 'Match History'}</h2>
    {kind === 'ranking' && <p className="availability">Only matches with the selected configuration are compared. Ties use active duration, completion date, then match ID.</p>}
    {network.status === 'loading' && <p role="status">Connecting to match records…</p>}
    {network.status === 'error' && <div><p role="alert">{network.error ?? 'Match records are unavailable.'}</p>
      <button type="button" className="secondary-button" onClick={() => void runtime.start()}>Retry Connection</button></div>}
    {network.status === 'ready' && query.isPending && <p role="status">Loading {kind === 'ranking' ? 'ranking' : 'match history'}…</p>}
    {data && query.isFetching && <p role="status">Refreshing match records…</p>}
    {query.isError && <div><p role="alert">{normalizeApiError(query.error).message}{data && ' Previously loaded records are shown.'}</p>
      <button type="button" className="secondary-button" onClick={() => void query.refetch()}>Retry Records</button></div>}
    {data && data.items.length === 0 && <p>No matches found.</p>}
    {data && data.items.length > 0 && <div className="table-scroll"><table>
      <caption>{kind === 'ranking' ? 'Ranked matches' : 'Your completed matches'}</caption>
      <thead><tr>{kind === 'ranking' ? <><th scope="col">Rank</th><th scope="col">Player</th></> : <th scope="col">Date</th>}
        <th scope="col">Score</th><th scope="col">Active time</th>{kind === 'history' && <th scope="col">End reason</th>}</tr></thead>
      <tbody>{data.items.map((item: MatchRecord | RankingEntry) => <tr key={item.matchId} data-match-id={item.matchId}>
        {'rank' in item ? <><td>{item.rank}</td><td>{item.playerName}<span className="visually-hidden"> ({item.playerId})</span></td></>
          : <td><time dateTime={item.playedAt}>{new Date(item.playedAt).toLocaleString('en-US')}</time></td>}
        <td>{item.score}</td><td>{(item.durationMs / 1000).toFixed(1)}s</td>
        {'endReason' in item && <td>{item.endReason === 'player-death' ? 'Ship destroyed' : 'Time expired'}</td>}
      </tr>)}</tbody>
    </table></div>}
    {data && <nav className="pagination" aria-label={`${kind} pagination`}>
      <button type="button" className="secondary-button" disabled={page <= 1 || query.isFetching} onClick={() => onPage(page - 1)}>Previous</button>
      <span>Page {page} of {Math.max(1, data.totalPages)} · {data.total} matches</span>
      <button type="button" className="secondary-button" disabled={page >= data.totalPages || query.isFetching} onClick={() => onPage(page + 1)}>Next</button>
    </nav>}
  </section>
}
