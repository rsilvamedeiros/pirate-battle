import sharedStyles from '../styles/ui.module.scss'
import styles from './MainMenu.module.scss'
import type { RefObject } from 'react'
import type { PlayerOptions } from '../persistence/options'
import type { LastResult, ResultsStore } from '../persistence/results'
import type { DataRuntime } from '../api/runtime'
import { defaultGameplayConfig } from '../core/config'
import { configurationKey } from '../api/contracts'
import { RecordsPanel } from './RecordsPanel'
import { NetworkPanel } from './NetworkPanel'

export interface MenuState {
  tab: 'ranking' | 'history' | null
  rankingPage: number
  historyPage: number
  group: 'current' | 'last'
}

interface MainMenuProps {
  options: Readonly<PlayerOptions>
  lastResult: LastResult | null
  resultsStore: ResultsStore
  dataRuntime: DataRuntime
  state: Readonly<MenuState>
  onStateChange(update: (current: MenuState) => MenuState): void
  optionsButtonRef: RefObject<HTMLButtonElement | null>
  onPlay(): void
  onOptions(): void
  onLastResult(): void
}

const controls = [
  ['Move forward', 'W / ↑', 'Hold Forward'],
  ['Rotate left', 'A / ←', 'Hold Rotate Left'],
  ['Rotate right', 'D / →', 'Hold Rotate Right'],
  ['Front fire', 'Space', 'Hold Front Fire'],
  ['Left side fire', 'Q', 'Hold Left Fire'],
  ['Right side fire', 'E', 'Hold Right Fire'],
  ['Pause', 'Esc / P', 'Tap Pause'],
]

export function MainMenu({
  options,
  lastResult,
  resultsStore,
  dataRuntime,
  state,
  onStateChange,
  optionsButtonRef,
  onPlay,
  onOptions,
  onLastResult,
}: MainMenuProps) {
  const { tab, rankingPage, historyPage, group } = state
  const key =
    group === 'last' && lastResult
      ? lastResult.record.configKey
      : configurationKey({
          ...defaultGameplayConfig,
          sessionTime: options.sessionTime,
          enemySpawnInterval: options.enemySpawnInterval,
        })
  return (
    <section aria-labelledby="menu-heading">
      <h1 id="menu-heading" className={styles['game-title']}>
        <img
          src={`${import.meta.env.BASE_URL}assets/png/retina/ui/menu/title_pirate_battle.png`}
          alt="Pirate Battle"
        />
      </h1>
      <p className={styles['tagline']}>Set sail. Take command.</p>
      <div className={styles['menu-actions']}>
        <button type="button" className={sharedStyles['primary-button']} onClick={onPlay}>
          Play
        </button>
        <button
          type="button"
          className={sharedStyles['primary-button']}
          ref={optionsButtonRef}
          onClick={onOptions}
        >
          Options
        </button>
        {lastResult && (
          <button type="button" className={sharedStyles['secondary-button']} onClick={onLastResult}>
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
            onClick={() => onStateChange((current) => ({ ...current, tab: kind }))}
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
                onStateChange((current) => ({ ...current, tab: next }))
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
            value={group === 'last' && !lastResult ? 'current' : group}
            onChange={(event) => {
              const group = event.target.value === 'last' ? 'last' : 'current'
              onStateChange((current) => ({ ...current, group, rankingPage: 1 }))
            }}
          >
            <option value="current">Current options</option>
            {lastResult && <option value="last">Last result</option>}
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
          onPage={(page) =>
            onStateChange((current) =>
              tab === 'ranking'
                ? { ...current, rankingPage: page }
                : { ...current, historyPage: page },
            )
          }
        />
      )}
      <NetworkPanel runtime={dataRuntime} store={resultsStore} />
    </section>
  )
}
