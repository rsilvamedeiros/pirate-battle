import { useState, useSyncExternalStore } from 'react'
import type { DataRuntime } from '../api/runtime'
import { scenarioDefinitions, isScenarioId } from '../mocks/scenarios'
import type { ResultsStore } from '../persistence/results'

export function NetworkPanel({ runtime, store }: { runtime: DataRuntime; store: ResultsStore }) {
  const scenario = useSyncExternalStore(runtime.scenarios.subscribe, runtime.scenarios.getSnapshot)
  const network = useSyncExternalStore(runtime.subscribe, runtime.getSnapshot)
  const results = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const [selection, setSelection] = useState(scenario.id)
  return (
    <details className="network-panel">
      <summary>Network scenarios</summary>
      <label htmlFor="network-scenario">Scenario</label>
      <select
        id="network-scenario"
        value={selection}
        disabled={network.busy}
        onChange={(event) => {
          if (isScenarioId(event.target.value)) setSelection(event.target.value)
        }}
      >
        {Object.entries(scenarioDefinitions).map(([id]) => (
          <option key={id} value={id}>
            {id}
          </option>
        ))}
      </select>
      <p>
        Active: {scenario.id}. {scenarioDefinitions[scenario.id]}
      </p>
      {scenario.notice && <p role="status">{scenario.notice}</p>}
      {network.error && network.status !== 'error' && <p role="alert">{network.error}</p>}
      <button
        type="button"
        className="secondary-button"
        disabled={network.busy}
        onClick={() => void runtime.changeScenario(selection)}
      >
        Apply
      </button>
      {scenario.id === 'offline-at-match-end' && (
        <button
          type="button"
          className="secondary-button"
          disabled={network.busy}
          onClick={() => {
            setSelection('success')
            void runtime.changeScenario('success')
          }}
        >
          Recover connection
        </button>
      )}
      <p className="availability">
        Reset discards completed demo records, the last result and all pending submissions. Options
        and player identity are kept.
      </p>
      <button
        type="button"
        className="secondary-button"
        disabled={network.busy}
        onClick={() => void runtime.changeScenario(scenario.id, true)}
      >
        Reset demo data
      </button>
      {Object.keys(results.entries).length > 0 && (
        <div className="pending-records">
          <p>{Object.keys(results.entries).length} pending registrations. You can keep playing.</p>
          {Object.values(results.entries).map(({ record, lastError }) => (
            <div key={record.matchId}>
              <p>
                Score {record.score} · {new Date(record.playedAt).toLocaleString('en-US')}
                {lastError && ` · ${lastError}`}
              </p>
              <button
                type="button"
                className="secondary-button"
                onClick={() => store.retrySubmission(record.matchId)}
              >
                Retry Registration
              </button>
            </div>
          ))}
        </div>
      )}
    </details>
  )
}
