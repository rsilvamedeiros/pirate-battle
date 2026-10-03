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
import { MainMenu } from './ui/MainMenu'
import type { MenuState } from './ui/MainMenu'

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
  const [menuState, setMenuState] = useState<MenuState>({
    tab: null,
    rankingPage: 1,
    historyPage: 1,
    group: 'current',
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
    setMenuState((current) => ({ ...current, rankingPage: 1 }))
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
          <MainMenu
            options={options}
            lastResult={results.lastResult}
            resultsStore={resultsStore}
            dataRuntime={dataRuntime}
            state={menuState}
            onStateChange={setMenuState}
            optionsButtonRef={optionsButton}
            onPlay={play}
            onOptions={() => setScreen('options')}
            onLastResult={() => setScreen('result')}
          />
        )}
      </div>
    </main>
  )
}

export default App
