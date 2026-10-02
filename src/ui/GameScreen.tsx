import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { PointerEvent } from 'react'
import { createGameEngine } from '../engine/game-engine'
import type { GameEngine, MovementAction } from '../engine/game-engine'
import { createArenaView } from '../render/arena-view'
import { attachKeyboard } from '../input/keyboard'
import { fixedStepMs } from '../core/simulation'
import type { GameHooks } from '../engine/test-hooks'
import type { GameplayConfig } from '../core/config'
import './GameScreen.css'

function SessionDialog({ engine, onExit, onRestart }: { engine: GameEngine; onExit(): void; onRestart(): void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const completed = engine.getState().status === 'completed'
  useEffect(() => {
    const element = dialog.current!
    element.showModal()
    return () => { element.close() }
  }, [])
  return (
    <dialog ref={dialog} className="session-dialog" aria-labelledby="session-dialog-heading" onCancel={(event) => {
      event.preventDefault()
      if (!completed) engine.resume()
    }}>
      <h2 id="session-dialog-heading">{completed ? 'Voyage complete' : 'Paused'}</h2>
      <p>{completed ? 'Time expired. Your voyage has ended.' : 'Take a breath. Resume when you are ready.'}</p>
      {completed
        ? <button type="button" className="primary-button" onClick={onRestart}>Play Again</button>
        : <button type="button" className="primary-button" onClick={() => engine.resume()}>Resume</button>}
      <button type="button" className="secondary-button" onClick={onExit}>Main Menu</button>
    </dialog>
  )
}

export function GameScreen({ config, onExit, onRestart }: { config: GameplayConfig; onExit(): void; onRestart(): void }) {
  const host = useRef<HTMLDivElement>(null)
  const root = useRef<HTMLElement>(null)
  const [runtime] = useState(() => {
    const manual = new URLSearchParams(location.search).get('e2e') === '1'
    let time = 0
    const clock = { now: () => manual ? time : performance.now() }
    return { manual, engine: createGameEngine(config, clock), addTime: (milliseconds: number) => { time += milliseconds } }
  })
  const { engine } = runtime
  const snapshot = useSyncExternalStore(engine.subscribe, engine.getSnapshot)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    let disposed = false
    let view: Awaited<ReturnType<typeof createArenaView>> | undefined
    let removeInput: (() => void) | undefined
    let hooks: GameHooks | undefined
    async function boot() {
      try {
        const candidate = await createArenaView(host.current!, engine, runtime.manual)
        if (disposed) { candidate.destroy(); return }
        view = candidate
        candidate.start()
        removeInput = attachKeyboard(engine)
        root.current?.focus()
        if (document.hidden || !document.hasFocus()) engine.pause()
        if (runtime.manual) {
          hooks = {
            getState: () => structuredClone(engine.getState()),
            advance(milliseconds) {
              if (!Number.isFinite(milliseconds) || milliseconds < 0) throw new RangeError('Time must be finite and non-negative.')
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
    }
  }, [engine, runtime])

  function press(event: PointerEvent<HTMLButtonElement>, action: MovementAction) {
    event.currentTarget.setPointerCapture(event.pointerId)
    engine.press(`pointer:${event.pointerId}`, action)
  }
  function release(event: PointerEvent<HTMLButtonElement>) { engine.release(`pointer:${event.pointerId}`) }

  return (
    <main className="game-screen" tabIndex={-1} ref={root} aria-label="Game session">
      <header className="game-hud">
        <h1>Pirate Battle</h1>
        <div className="hud-values" aria-label="Match status">
          <span>Health: {snapshot.health}</span><span>Score: {snapshot.score}</span>
          <span data-testid="remaining-time">Time: {snapshot.remainingSeconds}s</span>
          <span className="visually-hidden">{snapshot.status}</span>
        </div>
        <button type="button" className="secondary-button" disabled={!ready || snapshot.status !== 'running'} onClick={() => engine.pause()}>Pause</button>
      </header>
      <div className="arena-frame" ref={host}>
        {!ready && !error && <p role="status" className="arena-message">Loading your ship…</p>}
        {error && <div className="arena-message"><p role="alert">The arena could not be loaded.</p>
          <button type="button" className="primary-button" onClick={onRestart}>Retry</button>
          <button type="button" className="secondary-button" onClick={onExit}>Main Menu</button>
        </div>}
      </div>
      {!ready && !error && <button type="button" className="secondary-button" onClick={onExit}>Main Menu</button>}
      <nav className="movement-controls" aria-label="Ship controls">
        {([['left', 'Rotate Left'], ['forward', 'Forward'], ['right', 'Rotate Right']] as const).map(([action, label]) => (
          <button key={action} type="button" disabled={!ready || snapshot.status !== 'running'}
            onPointerDown={(event) => press(event, action)} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}>{label}</button>
        ))}
      </nav>
      <p className="navigation-hint">W / ↑ to sail · A / ← and D / → to rotate · Esc / P to pause</p>
      {ready && snapshot.status !== 'running' && <SessionDialog key={snapshot.status} engine={engine} onExit={onExit} onRestart={onRestart} />}
    </main>
  )
}
