import type { LastResult, ResultsStore } from '../persistence/results'

export function ResultDetails({ result, store }: { result: LastResult; store: ResultsStore }) {
  const { record } = result
  const snapshot = store.getSnapshot()
  return (
    <div className="result-details">
      <dl>
        <div>
          <dt>Score</dt>
          <dd>{record.score}</dd>
        </div>
        <div>
          <dt>Active time</dt>
          <dd>{(record.durationMs / 1000).toFixed(1)}s</dd>
        </div>
        <div>
          <dt>End reason</dt>
          <dd>{record.endReason === 'player-death' ? 'Ship destroyed' : 'Time expired'}</dd>
        </div>
        <div>
          <dt>Completed at</dt>
          <dd>
            <time dateTime={record.playedAt}>
              {new Date(record.playedAt).toLocaleString('en-US')}
            </time>
          </dd>
        </div>
      </dl>
      <p role="status">
        {result.submissionStatus === 'confirmed'
          ? 'Registration confirmed.'
          : result.submissionStatus === 'sending'
            ? 'Registering match…'
            : result.submissionStatus === 'error'
              ? 'Registration pending. Please retry.'
              : 'Registration pending.'}
      </p>
      {result.submissionStatus !== 'confirmed' && (
        <p className="availability">You can play again while this record is pending.</p>
      )}
      {result.lastError && <p role="alert">{result.lastError}</p>}
      {result.submissionStatus !== 'confirmed' && (
        <button
          type="button"
          className="secondary-button"
          onClick={() => store.retrySubmission(record.matchId)}
        >
          Retry Registration
        </button>
      )}
      {snapshot.writeFailed && (
        <>
          <p role="alert" className="storage-notice">
            {snapshot.notice}
          </p>
          <button
            type="button"
            className="secondary-button"
            onClick={() => store.retryPersistence()}
          >
            Retry Save
          </button>
        </>
      )}
    </div>
  )
}
