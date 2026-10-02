import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { browserOptionsStorage, savePlayerOptions } from './persistence/options'
import type { LoadedOptions, PlayerOptions } from './persistence/options'
import { OptionsScreen } from './ui/OptionsScreen'
import { GameScreen } from './ui/GameScreen'
import { defaultGameplayConfig } from './core/config'
import type { ResultsStore } from './persistence/results'
import { ResultDetails } from './ui/ResultDetails'
import './App.css'

const controls = [
  ['Move forward', 'W / ↑', 'Hold Forward'],
  ['Rotate left', 'A / ←', 'Hold Rotate Left'],
  ['Rotate right', 'D / →', 'Hold Rotate Right'],
  ['Front fire', 'Space', 'Hold Front Fire'],
  ['Left side fire', 'Q', 'Hold Left Fire'],
  ['Right side fire', 'E', 'Hold Right Fire'],
  ['Pause', 'Esc / P', 'Tap Pause'],
]

function App({ initialOptions, resultsStore }: { initialOptions: LoadedOptions; resultsStore: ResultsStore }) {
  const [screen, setScreen] = useState<'menu' | 'options' | 'game' | 'result'>('menu')
  const [session, setSession] = useState(0)
  const [options, setOptions] = useState(initialOptions.options)
  const [notice, setNotice] = useState(initialOptions.notice)
  const optionsButton = useRef<HTMLButtonElement>(null)
  const resultHeading = useRef<HTMLHeadingElement>(null)
  const results = useSyncExternalStore(resultsStore.subscribe, resultsStore.getSnapshot)
  useEffect(() => { if (screen === 'result') resultHeading.current?.focus() }, [screen])

  function play() { setSession((value) => value + 1); setScreen('game') }

  function saveOptions(nextOptions: Readonly<PlayerOptions>) {
    if (!savePlayerOptions(browserOptionsStorage, nextOptions)) return false
    setOptions(nextOptions)
    setNotice(null)
    return true
  }

  if (screen === 'game') return <GameScreen key={session}
    resultsStore={resultsStore}
    config={{ ...defaultGameplayConfig, sessionTime: options.sessionTime, enemySpawnInterval: options.enemySpawnInterval }}
    onExit={() => { setScreen('menu'); requestAnimationFrame(() => optionsButton.current?.focus()) }}
    onRestart={() => setSession((value) => value + 1)} />

  return (
    <main className="app-shell">
      <div className="menu-panel">
        {notice && <p className="storage-notice" role="status">{notice}</p>}
        {results.notice && !notice && !results.writeFailed && <p className="storage-notice" role="status">{results.notice}</p>}
        {screen === 'result' && results.lastResult ? (
          <section aria-labelledby="result-heading">
            <h1 id="result-heading" ref={resultHeading} tabIndex={-1}>Last Result</h1>
            <ResultDetails result={results.lastResult} store={resultsStore} />
            <div className="form-actions">
              <button type="button" className="primary-button" onClick={play}>Play Again</button>
              <button type="button" className="secondary-button" onClick={() => { setScreen('menu'); requestAnimationFrame(() => optionsButton.current?.focus()) }}>Main Menu</button>
            </div>
          </section>
        ) : screen === 'options' ? (
          <OptionsScreen
            options={options}
            onSave={saveOptions}
            onBack={() => {
              setScreen('menu')
              requestAnimationFrame(() => optionsButton.current?.focus())
            }}
          />
        ) : (
          <section aria-labelledby="menu-heading">
            <h1 id="menu-heading" className="game-title">
              <img src={`${import.meta.env.BASE_URL}assets/png/retina/ui/menu/title_pirate_battle.png`} alt="Pirate Battle" />
            </h1>
            <p className="tagline">Set sail. Take command.</p>
            <div className="menu-actions">
              <button type="button" className="primary-button" onClick={play}>Play</button>
              <button type="button" className="primary-button" ref={optionsButton} onClick={() => setScreen('options')}>Options</button>
              {results.lastResult && <button type="button" className="secondary-button" onClick={() => setScreen('result')}>Last Result</button>}
            </div>
            <p className="availability">Face Chasers and Shooters. Stay afloat and earn your score.</p>
            <p className="session-summary">{options.sessionTime}s voyage · Enemies every {options.enemySpawnInterval}s</p>
            <details className="controls">
              <summary>Controls</summary>
              <p>Move, rotate, and fire together. Touch controls support simultaneous actions.</p>
              <div className="table-scroll">
                <table>
                  <caption className="visually-hidden">Keyboard and touch controls</caption>
                  <thead><tr><th>Action</th><th>Keyboard</th><th>Touch</th></tr></thead>
                  <tbody>{controls.map(([action, keyboard, touch]) => <tr key={action}><th scope="row">{action}</th><td>{keyboard}</td><td>{touch}</td></tr>)}</tbody>
                </table>
              </div>
            </details>
            <nav className="ranking-actions" aria-label="Match records">
              <button type="button" className="secondary-button" disabled aria-describedby="records-availability">Ranking</button>
              <button type="button" className="secondary-button" disabled aria-describedby="records-availability">Match History</button>
            </nav>
            <p id="records-availability" className="availability">Match records are coming soon.</p>
          </section>
        )}
      </div>
    </main>
  )
}

export default App
