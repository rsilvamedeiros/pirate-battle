import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { PointerEvent } from 'react'
import { createGameEngine } from '../engine/game-engine'
import type { GameEngine, GameAction } from '../engine/game-engine'
import { createArenaView } from '../render/arena-view'
import { attachKeyboard } from '../input/keyboard'
import { fixedStepMs } from '../core/simulation'
import type { GameHooks } from '../engine/test-hooks'
import type { GameplayConfig } from '../core/config'
import { prepareMatch } from '../engine/scenarios'
import { createRenderProfiler, profilingConfiguration } from '../engine/profiling'
import type { ResultsStore } from '../persistence/results'
import { ResultDetails } from './ResultDetails'
import './GameScreen.scss'

function SessionDialog({
  engine,
  resultsStore,
  onExit,
  onRestart,
  onResume,
}: {
  engine: GameEngine
  resultsStore: ResultsStore
  onExit(): void
  onRestart(): void
  onResume(): void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const completed = engine.getState().status === 'completed'
  const dead = engine.getState().endReason === 'player-death'
  useEffect(() => {
    const element = dialog.current!
    element.showModal()
    return () => {
      element.close()
    }
  }, [])
  return (
    <dialog
      ref={dialog}
      className="session-dialog"
      aria-labelledby="session-dialog-heading"
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((element) => element.getClientRects().length > 0)
        const first = controls[0],
          last = controls.at(-1)
        if (!first || !last) return
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }}
      onCancel={(event) => {
        event.preventDefault()
        if (!completed) onResume()
      }}
    >
      <h2 id="session-dialog-heading">{completed ? 'Voyage complete' : 'Paused'}</h2>
      <p>
        {completed
          ? dead
            ? 'Your ship was destroyed.'
            : 'Time expired. Your voyage has ended.'
          : 'Take a breath. Resume when you are ready.'}
      </p>
      {completed && resultsStore.getSnapshot().lastResult && (
        <ResultDetails result={resultsStore.getSnapshot().lastResult!} store={resultsStore} />
      )}
      {completed ? (
        <button type="button" className="primary-button" onClick={onRestart}>
          Play Again
        </button>
      ) : (
        <button type="button" className="primary-button" onClick={onResume}>
          Resume
        </button>
      )}
      <button type="button" className="secondary-button" onClick={onExit}>
        Main Menu
      </button>
    </dialog>
  )
}

export function GameScreen({
  config,
  resultsStore,
  onExit,
  onRestart,
}: {
  config: GameplayConfig
  resultsStore: ResultsStore
  onExit(): void
  onRestart(): void
}) {
  const host = useRef<HTMLDivElement>(null)
  const root = useRef<HTMLElement>(null)
  const pauseButton = useRef<HTMLButtonElement>(null)
  const [runtime] = useState(() => {
    const parameters = new URLSearchParams(location.search)
    const manual = parameters.get('e2e') === '1'
    const profiling = !manual && parameters.get('profile') === '1'
    const requestedSeed = Number(parameters.get('seed') ?? 1)
    const seed =
      manual || profiling
        ? Number.isInteger(requestedSeed) && requestedSeed >= 0 && requestedSeed <= 4294967295
          ? requestedSeed
          : 1
        : crypto.getRandomValues(new Uint32Array(1))[0]
    const selected = profiling
      ? profilingConfiguration(config, parameters.get('preset') === 'endurance')
      : config
    const match = prepareMatch(selected, seed, manual ? parameters.get('fixture') : null)
    let time = 0
    const clock = { now: () => (manual ? time : performance.now()) }
    const engine = createGameEngine(match.config, clock, match.setup)
    return {
      manual,
      engine,
      profiler: profiling ? createRenderProfiler(engine.getState, seed) : null,
      addTime: (milliseconds: number) => {
        time += milliseconds
      },
    }
  })
  const { engine } = runtime
  const snapshot = useSyncExternalStore(engine.subscribe, engine.getSnapshot)
  const previousStatus = useRef(snapshot.status)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)

  // Restore after the dialog's effect cleanup, which can change native focus.
  useEffect(() => {
    if (previousStatus.current === 'paused' && snapshot.status === 'running')
      pauseButton.current?.focus()
    previousStatus.current = snapshot.status
  }, [snapshot.status])

  useEffect(() => {
    function captureCompletion() {
      if (engine.getState().status === 'completed') resultsStore.complete(engine.getState())
    }
    captureCompletion()
    return engine.subscribe(captureCompletion)
  }, [engine, resultsStore])

  useEffect(() => {
    let disposed = false
    let view: Awaited<ReturnType<typeof createArenaView>> | undefined
    let removeInput: (() => void) | undefined
    let hooks: GameHooks | undefined
    async function boot() {
      try {
        const candidate = await createArenaView(
          host.current!,
          engine,
          runtime.manual,
          runtime.profiler?.frame,
        )
        if (disposed) {
          candidate.destroy()
          return
        }
        view = candidate
        candidate.start()
        removeInput = attachKeyboard(engine)
        root.current?.focus()
        if (document.hidden || !document.hasFocus()) engine.pause()
        if (runtime.profiler) window.__profiling = runtime.profiler
        if (runtime.manual) {
          hooks = {
            getState: () => structuredClone(engine.getState()),
            advance(milliseconds) {
              if (!Number.isFinite(milliseconds) || milliseconds < 0)
                throw new RangeError('Time must be finite and non-negative.')
              let remaining = milliseconds
              while (remaining > 1e-8) {
                const delta = Math.min(fixedStepMs, remaining)
                runtime.addTime(delta)
                engine.frame()
                remaining -= delta
              }
              candidate.draw()
            },
          }
          window.__game = hooks
        }
        setReady(true)
      } catch {
        if (!disposed) setError(true)
      }
    }
    void boot()
    return () => {
      disposed = true
      removeInput?.()
      engine.clearActions()
      view?.destroy()
      if (hooks && window.__game === hooks) delete window.__game
      if (runtime.profiler && window.__profiling === runtime.profiler) delete window.__profiling
    }
  }, [engine, runtime])

  function press(event: PointerEvent<HTMLButtonElement>, action: GameAction) {
    event.currentTarget.setPointerCapture(event.pointerId)
    engine.press(`pointer:${event.pointerId}`, action)
  }
  function release(event: PointerEvent<HTMLButtonElement>) {
    engine.release(`pointer:${event.pointerId}`)
  }

  return (
    <main className="game-screen" tabIndex={-1} ref={root} aria-label="Game session">
      <header className="game-hud">
        <h1>Pirate Battle</h1>
        <div className="hud-values" aria-label="Match status">
          <span>Health: {snapshot.health}</span>
          <span>Score: {snapshot.score}</span>
          <span data-testid="remaining-time">Time: {snapshot.remainingSeconds}s</span>
          <span className="visually-hidden">{snapshot.status}</span>
        </div>
        <button
          ref={pauseButton}
          type="button"
          className="secondary-button"
          disabled={!ready || snapshot.status !== 'running'}
          onClick={() => engine.pause()}
        >
          Pause
        </button>
      </header>
      <div className="arena-frame" ref={host}>
        {!ready && !error && (
          <p role="status" className="arena-message">
            Loading your ship…
          </p>
        )}
        {error && (
          <div className="arena-message">
            <p role="alert">The arena could not be loaded.</p>
            <button type="button" className="primary-button" onClick={onRestart}>
              Retry
            </button>
            <button type="button" className="secondary-button" onClick={onExit}>
              Main Menu
            </button>
          </div>
        )}
      </div>
      {!ready && !error && (
        <button type="button" className="secondary-button" onClick={onExit}>
          Main Menu
        </button>
      )}
      <nav className="movement-controls" aria-label="Ship controls">
        {(
          [
            ['left', 'Rotate Left'],
            ['forward', 'Forward'],
            ['right', 'Rotate Right'],
            ['leftFire', 'Left Fire'],
            ['frontFire', 'Front Fire'],
            ['rightFire', 'Right Fire'],
          ] as const
        ).map(([action, label]) => (
          <button
            key={action}
            type="button"
            disabled={!ready || snapshot.status !== 'running'}
            onPointerDown={(event) => press(event, action)}
            onPointerUp={release}
            onPointerCancel={release}
            onLostPointerCapture={release}
          >
            {label}
          </button>
        ))}
      </nav>
      <p className="navigation-hint">
        W / ↑ to sail · A / ← and D / → to rotate · Space to fire · Q / E for broadsides · Esc / P
        to pause
      </p>
      {runtime.profiler && (
        <p className="navigation-hint">
          Profiling enabled · real clock · seed{' '}
          {new URLSearchParams(location.search).get('seed') ?? '1'}
          {new URLSearchParams(location.search).get('preset') === 'endurance' &&
            ' · endurance preset: 500 HP, 1 damage, 180s'}
        </p>
      )}
      {ready && snapshot.status !== 'running' && (
        <SessionDialog
          key={snapshot.status}
          engine={engine}
          resultsStore={resultsStore}
          onExit={onExit}
          onRestart={onRestart}
          onResume={() => engine.resume()}
        />
      )}
    </main>
  )
}
