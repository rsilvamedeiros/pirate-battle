import { describe, expect, it, vi } from 'vitest'
import { defaultGameplayConfig } from '../core/config'
import { fixedStepMs } from '../core/simulation'
import { createGameEngine } from './game-engine'

function setup() {
  let now = 0
  const engine = createGameEngine(defaultGameplayConfig, { now: () => now })
  engine.frame()
  return { engine, frame: (milliseconds: number) => { now += milliseconds; engine.frame() } }
}

describe('fixed-step engine', () => {
  it.each([30, 60, 144])('produces the same movement and active time at %s display frames per second', (fps) => {
    const { engine, frame } = setup()
    engine.press('keyboard', 'forward')
    for (let index = 0; index < fps; index++) frame(1000 / fps)
    expect(engine.getState().ticks).toBe(60)
    expect(engine.getState().elapsedMs).toBeCloseTo(1000)
    expect(engine.getState().player.x).toBeCloseTo(330)
  })
  it('accumulates partial frames into complete steps', () => {
    const { engine, frame } = setup()
    engine.press('test', 'forward')
    frame(8)
    expect(engine.getState().ticks).toBe(0)
    frame(9)
    expect(engine.getState().ticks).toBe(1)
    expect(engine.getState().player.x).toBeCloseTo(153)
  })
  it('clamps a stalled frame to 250 milliseconds', () => {
    const { engine, frame } = setup()
    frame(2000)
    expect(engine.getState().elapsedMs).toBeCloseTo(250)
    expect(engine.getState().ticks).toBe(15)
  })
  it('clears the accumulator and held actions on pause and resume', () => {
    const { engine, frame } = setup()
    engine.press('keyboard', 'forward')
    frame(8)
    engine.pause()
    frame(10000)
    engine.press('paused-pointer', 'forward')
    engine.resume()
    frame(9)
    expect(engine.getState().ticks).toBe(0)
    frame(8)
    expect(engine.getState().ticks).toBe(1)
    expect(engine.getState().player.x).toBe(150)
    engine.press('fresh-input', 'forward')
    frame(fixedStepMs)
    expect(engine.getState().player.x).toBeCloseTo(153)
  })
  it('keeps concurrent input sources independent', () => {
    const { engine, frame } = setup()
    engine.press('keyboard', 'forward')
    engine.press('touch', 'forward')
    engine.release('keyboard')
    frame(fixedStepMs)
    expect(engine.getState().player.x).toBeCloseTo(153)
    engine.release('touch')
    frame(fixedStepMs)
    expect(engine.getState().player.x).toBeCloseTo(153)
  })
  it('publishes HUD snapshots only when visible values change', () => {
    const { engine, frame } = setup()
    const snapshot = engine.getSnapshot()
    const listener = vi.fn()
    const unsubscribe = engine.subscribe(listener)
    frame(50)
    expect(engine.getSnapshot()).toBe(snapshot)
    expect(listener).not.toHaveBeenCalled()
    engine.pause()
    expect(engine.getSnapshot().status).toBe('paused')
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    engine.resume()
    expect(listener).toHaveBeenCalledTimes(1)
  })
  it('cannot resume a completed session', () => {
    const { engine, frame } = setup()
    for (let i = 0; i < 480; i++) frame(250)
    const state = engine.getState()
    expect(state.status).toBe('completed')
    engine.resume()
    engine.press('test', 'forward')
    frame(500)
    expect(engine.getState()).toBe(state)
  })
})
