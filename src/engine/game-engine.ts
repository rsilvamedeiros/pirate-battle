import { createInitialState, fixedStepMs, stepSimulation } from '../core/simulation'
import type { GameInput, InitialSetup } from '../core/simulation'
import type { GameplayConfig } from '../core/config'

export interface GameClock { now(): number }
export interface HudSnapshot {
  health: number
  score: number
  remainingSeconds: number
  status: 'running' | 'paused' | 'completed'
}

export const maxFrameMs = 250
export type GameAction = keyof GameInput

export function createGameEngine(config: GameplayConfig, clock: GameClock, setup: InitialSetup = {}) {
  let state = createInitialState(config, setup)
  let lastTime: number | null = null
  let accumulator = 0
  const actions = new Map<string, GameAction>()
  const listeners = new Set<() => void>()

  function makeSnapshot(): Readonly<HudSnapshot> {
    return Object.freeze({
      health: state.player.hp,
      score: state.score,
      remainingSeconds: Math.ceil((state.config.sessionTime * 1000 - state.elapsedMs) / 1000),
      status: state.status,
    })
  }
  let snapshot = makeSnapshot()

  function publish() {
    const next = makeSnapshot()
    if (next.health === snapshot.health && next.score === snapshot.score
      && next.remainingSeconds === snapshot.remainingSeconds && next.status === snapshot.status) return
    snapshot = next
    for (const listener of listeners) listener()
  }

  function clearActions() { actions.clear() }

  return {
    getState: () => state,
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    press(source: string, action: GameAction) {
      if (state.status === 'running') actions.set(source, action)
    },
    release(source: string) { actions.delete(source) },
    clearActions,
    pause() {
      if (state.status !== 'running') return
      state = { ...state, status: 'paused' }
      accumulator = 0
      lastTime = null
      clearActions()
      publish()
    },
    resume() {
      if (state.status !== 'paused') return
      state = { ...state, status: 'running' }
      accumulator = 0
      lastTime = clock.now()
      clearActions()
      publish()
    },
    frame() {
      const time = clock.now()
      if (state.status !== 'running') { lastTime = null; return }
      if (lastTime === null) { lastTime = time; return }
      accumulator += Math.min(maxFrameMs, Math.max(0, time - lastTime))
      lastTime = time
      const held = new Set(actions.values())
      const input: GameInput = { forward: held.has('forward'), left: held.has('left'), right: held.has('right'),
        frontFire: held.has('frontFire'), leftFire: held.has('leftFire'), rightFire: held.has('rightFire') }
      while (accumulator + 1e-8 >= fixedStepMs && state.status === 'running') {
        state = stepSimulation(state, input)
        accumulator = Math.max(0, accumulator - fixedStepMs)
      }
      if (state.status === 'completed') { accumulator = 0; clearActions() }
      publish()
    },
  }
}

export type GameEngine = ReturnType<typeof createGameEngine>
