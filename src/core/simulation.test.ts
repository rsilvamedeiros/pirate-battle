import { describe, expect, it } from 'vitest'
import { defaultGameplayConfig } from './config'
import { arena, createInitialState, fixedStepMs, island, playerRadius, stepSimulation } from './simulation'

const idle = { forward: false, left: false, right: false }

describe('navigation simulation', () => {
  it('starts with a detached configuration and fresh player state', () => {
    const config = { ...defaultGameplayConfig }
    const state = createInitialState(config)
    config.sessionTime = 180
    expect(state.config.sessionTime).toBe(120)
    expect(state.player).toEqual({ x: 150, y: 350, heading: 0, hp: 100 })
    expect(state.elapsedMs).toBe(0)
    expect(state.score).toBe(0)
  })
  it('moves forward using active simulation time', () => {
    const state = createInitialState(defaultGameplayConfig)
    const next = stepSimulation(state, { ...idle, forward: true })
    expect(next.player.x).toBeCloseTo(153)
    expect(next.player.y).toBe(350)
    expect(state.player.x).toBe(150)
    expect(next.elapsedMs).toBe(fixedStepMs)
  })
  it('rotates in both directions and cancels opposing rotation', () => {
    const state = createInitialState(defaultGameplayConfig)
    expect(stepSimulation(state, { ...idle, left: true }).player.heading).toBeCloseTo(-0.05)
    expect(stepSimulation(state, { ...idle, right: true }).player.heading).toBeCloseTo(0.05)
    expect(stepSimulation(state, { ...idle, left: true, right: true }).player.heading).toBe(0)
  })
  it.each([
    [playerRadius, 150, Math.PI], [arena.width - playerRadius, 150, 0],
    [150, playerRadius, -Math.PI / 2], [150, arena.height - playerRadius, Math.PI / 2],
  ])('contains the ship footprint at boundary %s / %s', (x, y, heading) => {
    const state = createInitialState(defaultGameplayConfig)
    state.player = { ...state.player, x, y, heading }
    const next = stepSimulation(state, { ...idle, forward: true })
    expect(next.player.x).toBeCloseTo(x)
    expect(next.player.y).toBeCloseTo(y)
  })
  it('blocks the ship at the island', () => {
    let state = createInitialState(defaultGameplayConfig)
    for (let tick = 0; tick < 300; tick++) state = stepSimulation(state, { ...idle, forward: true })
    expect(Math.hypot(state.player.x - island.x, state.player.y - island.y)).toBeGreaterThanOrEqual(island.radius + playerRadius)
    expect(state.player.x).toBeLessThanOrEqual(360)
  })
  it('suspends paused state without advancing timer or movement', () => {
    const state = { ...createInitialState(defaultGameplayConfig), status: 'paused' as const }
    expect(stepSimulation(state, { ...idle, forward: true })).toBe(state)
  })
  it('completes at the configured time without floating point drift', () => {
    let state = createInitialState({ ...defaultGameplayConfig, sessionTime: 60 })
    for (let tick = 0; tick < 3600; tick++) state = stepSimulation(state, idle)
    expect(state.elapsedMs).toBe(60000)
    expect(state.status).toBe('completed')
    expect(stepSimulation(state, { ...idle, forward: true })).toBe(state)
  })
  it('clips the last timestep to a fractional session duration', () => {
    let state = createInitialState({ ...defaultGameplayConfig, sessionTime: 60.001 })
    for (let tick = 0; tick < 3601; tick++) state = stepSimulation(state, idle)
    expect(state.elapsedMs).toBeCloseTo(60001)
    expect(state.status).toBe('completed')
  })
})
