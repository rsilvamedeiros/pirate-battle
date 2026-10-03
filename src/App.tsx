import sharedStyles from './styles/ui.module.scss'
import styles from './App.module.scss'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { browserOptionsStorage, savePlayerOptions } from './persistence/options'
import type { LoadedOptions, PlayerOptions } from './persistence/options'
import { OptionsScreen } from './ui/OptionsScreen'
import { GameScreen } from './ui/GameScreen'
import { defaultGameplayConfig } from './core/config'
import type { ResultsStore } from './persistence/results'
import { ResultDetails } from './ui/ResultDetails'
import type { DataRuntime } from './api/runtime'
import { configurationKey } from './api/contracts'
import { RecordsPanel } from './ui/RecordsPanel'
import { NetworkPanel } from './ui/NetworkPanel'

const controls = [
  ['Move forward', 'W / ↑', 'Hold Forward'],
  ['Rotate left', 'A / ←', 'Hold Rotate Left'],
  ['Rotate right', 'D / →', 'Hold Rotate Right'],
  ['Front fire', 'Space', 'Hold Front Fire'],
  ['Left side fire', 'Q', 'Hold Left Fire'],
  ['Right side fire', 'E', 'Hold Right Fire'],
  ['Pause', 'Esc / P', 'Tap Pause'],
]

function App({
  initialOptions,
  resultsStore,
  dataRuntime,
}: {
  initialOptions: LoadedOptions
  resultsStore: ResultsStore
  dataRuntime: DataRuntime
}) {
  const [screen, setScreen] = useState<'menu' | 'options' | 'game' | 'result'>('menu')
  const [session, setSession] = useState(0)
  const [options, setOptions] = useState(initialOptions.options)
  const [notice, setNotice] = useState(initialOptions.notice)
  const optionsButton = useRef<HTMLButtonElement>(null)
  const resultHeading = useRef<HTMLHeadingElement>(null)
  const results = useSyncExternalStore(resultsStore.subscribe, resultsStore.getSnapshot)
  const [tab, setTab] = useState<'ranking' | 'history' | null>(null)
  const [rankingPage, setRankingPage] = useState(1)
  const [historyPage, setHistoryPage] = useState(1)
  const [group, setGroup] = useState<'current' | 'last'>('current')
  const key =
    group === 'last' && results.lastResult
      ? results.lastResult.record.configKey
      : configurationKey({
          ...defaultGameplayConfig,
          sessionTime: options.sessionTime,
          enemySpawnInterval: options.enemySpawnInterval,
        })
  useEffect(() => {
    if (screen === 'result') resultHeading.current?.focus()
  }, [screen])

  function play() {
    setSession((value) => value + 1)
    setScreen('game')
  }

  function saveOptions(nextOptions: Readonly<PlayerOptions>) {
    if (!savePlayerOptions(browserOptionsStorage, nextOptions)) return false
    setOptions(nextOptions)
    setRankingPage(1)
    setNotice(null)
    return true
  }

  if (screen === 'game')
    return (
      <GameScreen
        key={session}
        resultsStore={resultsStore}
        config={{
          ...defaultGameplayConfig,
          sessionTime: options.sessionTime,
          enemySpawnInterval: options.enemySpawnInterval,
        }}
        onExit={() => {
          setScreen('menu')
          requestAnimationFrame(() => optionsButton.current?.focus())
        }}
        onRestart={() => setSession((value) => value + 1)}
      />
    )

  return (
    <main className={styles['app-shell']}>
      <div className={styles['menu-panel']}>
        {notice && (
          <p className={sharedStyles['storage-notice']} role="status">
            {notice}
          </p>
        )}
        {results.notice && !notice && !results.writeFailed && (
          <p className={sharedStyles['storage-notice']} role="status">
            {results.notice}
          </p>
        )}
        {screen === 'result' && results.lastResult ? (
          <section aria-labelledby="result-heading">
            <h1 id="result-heading" ref={resultHeading} tabIndex={-1}>
              Last Result
            </h1>
            <ResultDetails result={results.lastResult} store={resultsStore} />
            <div className={sharedStyles['form-actions']}>
              <button type="button" className={sharedStyles['primary-button']} onClick={play}>
                Play Again
              </button>
              <button
                type="button"
                className={sharedStyles['secondary-button']}
                onClick={() => {
                  setScreen('menu')
                  requestAnimationFrame(() => optionsButton.current?.focus())
                }}
              >
                Main Menu
              </button>
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
            <h1 id="menu-heading" className={styles['game-title']}>
              <img
                src={`${import.meta.env.BASE_URL}assets/png/retina/ui/menu/title_pirate_battle.png`}
                alt="Pirate Battle"
              />
            </h1>
            <p className={styles['tagline']}>Set sail. Take command.</p>
            <div className={styles['menu-actions']}>
              <button type="button" className={sharedStyles['primary-button']} onClick={play}>
                Play
              </button>
              <button
                type="button"
                className={sharedStyles['primary-button']}
                ref={optionsButton}
                onClick={() => setScreen('options')}
              >
                Options
              </button>
              {results.lastResult && (
                <button
                  type="button"
                  className={sharedStyles['secondary-button']}
                  onClick={() => setScreen('result')}
                >
                  Last Result
                </button>
              )}
            </div>
            <p className={sharedStyles['availability']}>
              Face Chasers and Shooters. Stay afloat and earn your score.
            </p>
            <p className={styles['session-summary']}>
              {options.sessionTime}s voyage · Enemies every {options.enemySpawnInterval}s
            </p>
            <details className={styles['controls']}>
              <summary>Controls</summary>
              <p>Move, rotate, and fire together. Touch controls support simultaneous actions.</p>
              <div className={sharedStyles['table-scroll']}>
                <table className={sharedStyles.table}>
                  <caption className="visually-hidden">Keyboard and touch controls</caption>
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Keyboard</th>
                      <th>Touch</th>
                    </tr>
                  </thead>
                  <tbody>
                    {controls.map(([action, keyboard, touch]) => (
                      <tr key={action}>
                        <th scope="row">{action}</th>
                        <td>{keyboard}</td>
                        <td>{touch}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
            <div className={styles['ranking-actions']} role="tablist" aria-label="Match records">
              {(['ranking', 'history'] as const).map((kind) => (
                <button
                  key={kind}
                  id={`${kind}-tab`}
                  type="button"
                  role="tab"
                  className={sharedStyles['secondary-button']}
                  aria-selected={tab === kind}
                  aria-controls={`${kind}-panel`}
                  onClick={() => setTab(kind)}
                  onKeyDown={(event) => {
                    if (
                      event.key === 'ArrowLeft' ||
                      event.key === 'ArrowRight' ||
                      event.key === 'Home' ||
                      event.key === 'End'
                    ) {
                      event.preventDefault()
                      const next =
                        event.key === 'Home'
                          ? 'ranking'
                          : event.key === 'End'
                            ? 'history'
                            : kind === 'ranking'
                              ? 'history'
                              : 'ranking'
                      setTab(next)
                      document.getElementById(`${next}-tab`)?.focus()
                    }
                  }}
                >
                  {kind === 'ranking' ? 'Ranking' : 'Match History'}
                </button>
              ))}
            </div>
            {tab === 'ranking' && (
              <div className={styles['configuration-group']}>
                <label htmlFor="ranking-group">Ranking configuration</label>
                <select
                  id="ranking-group"
                  value={group === 'last' && !results.lastResult ? 'current' : group}
                  onChange={(event) => {
                    setGroup(event.target.value === 'last' ? 'last' : 'current')
                    setRankingPage(1)
                  }}
                >
                  <option value="current">Current options</option>
                  {results.lastResult && <option value="last">Last result</option>}
                </select>
              </div>
            )}
            {tab && (
              <RecordsPanel
                key={tab}
                runtime={dataRuntime}
                kind={tab}
                playerId={options.playerId}
                configKey={key}
                page={tab === 'ranking' ? rankingPage : historyPage}
                onPage={tab === 'ranking' ? setRankingPage : setHistoryPage}
              />
            )}
            <NetworkPanel runtime={dataRuntime} store={resultsStore} />
          </section>
        )}
      </div>
    </main>
  )
}

export default App
