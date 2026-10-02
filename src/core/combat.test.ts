import { describe, expect, it } from 'vitest'
import { defaultGameplayConfig } from './config'
import { createInitialState, fixedStepMs, idleInput, stepSimulation } from './simulation'
import type { GameInput, SimulationState } from './simulation'

function steps(state: SimulationState, count: number, input: GameInput = idleInput) {
  for (let index = 0; index < count; index++) state = stepSimulation(state, input)
  return state
}

describe('player weapons', () => {
  it('fires one front projectile with configured direction, speed and damage', () => {
    const state = createInitialState(defaultGameplayConfig)
    const next = steps(state, 1, { ...idleInput, frontFire: true })
    expect(next.projectiles).toHaveLength(1)
    expect(next.projectiles[0]).toMatchObject({ weapon: 'frontFire', heading: 0, speed: 400, damage: 20, range: 600, lifetimeMs: 1500 })
    expect(next.projectiles[0].x).toBeCloseTo(196 + 400 / 60)
    expect(next.effects[0].kind).toBe('fire')
    expect(state.projectiles).toHaveLength(0)
  })
  it.each(['leftFire', 'rightFire'] as const)('fires three separated parallel projectiles from %s', (weapon) => {
    const state = steps(createInitialState(defaultGameplayConfig), 1, { ...idleInput, [weapon]: true })
    expect(state.projectiles).toHaveLength(3)
    expect(state.projectiles.map(({ x }) => x)).toEqual([134, 150, 166])
    for (const projectile of state.projectiles) {
      expect(projectile.heading).toBe(weapon === 'leftFire' ? -Math.PI / 2 : Math.PI / 2)
      expect(projectile.damage).toBe(15)
      expect(Math.abs(projectile.y - 350)).toBeGreaterThan(40)
    }
  })
  it('fires all weapons independently while moving and rotating', () => {
    const state = steps(createInitialState(defaultGameplayConfig), 1,
      { ...idleInput, forward: true, right: true, frontFire: true, leftFire: true, rightFire: true })
    expect(state.projectiles).toHaveLength(7)
    expect(state.player.x).toBeGreaterThan(150)
    expect(state.projectiles[0].heading).toBeCloseTo(0.05)
    expect(state.cooldowns).toEqual({ frontFire: 350, leftFire: 1000, rightFire: 1000 })
  })
  it('repeats held front fire at its cooldown without banking unused shots', () => {
    const input = { ...idleInput, frontFire: true }
    let state = steps(createInitialState(defaultGameplayConfig), 21, input)
    expect(state.cooldowns.frontFire).toBe(350)
    state = steps(state, 1, input)
    expect(state.cooldowns.frontFire).toBeCloseTo(700)
    state = steps(state, 60)
    const before = state.nextEntityId
    state = steps(state, 1, input)
    expect(state.nextEntityId - before).toBe(2) // One projectile and one muzzle effect.
  })
  it('removes a projectile at its first island contact and expires feedback', () => {
    let state = steps(createInitialState(defaultGameplayConfig), 1, { ...idleInput, frontFire: true })
    state = steps(state, 29)
    expect(state.projectiles).toHaveLength(0)
    expect(state.effects).toEqual([expect.objectContaining({ kind: 'impact', x: 396, y: 350 })])
    expect(state.score).toBe(0)
    expect(steps(state, 12).effects).toHaveLength(0)
  })
  it('removes shots whose muzzle is inside the island', () => {
    const state = createInitialState(defaultGameplayConfig)
    state.player.x = 359
    expect(steps(state, 1, { ...idleInput, frontFire: true }).projectiles).toHaveLength(0)
  })
  it('removes projectiles at the arena edge', () => {
    const state = createInitialState(defaultGameplayConfig)
    state.player = { ...state.player, x: 950, y: 100 }
    const next = steps(state, 1, { ...idleInput, frontFire: true })
    expect(next.projectiles).toHaveLength(0)
    expect(next.effects.some(({ kind, x }) => kind === 'impact' && x === 996)).toBe(true)
  })
  it.each([
    { frontProjectileRange: 100, frontProjectileLifetime: 5, ticks: 15 },
    { frontProjectileRange: 1200, frontProjectileLifetime: 0.25, ticks: 15 },
  ])('removes shots at the first configured range/lifetime limit: %j', ({ ticks, ...config }) => {
    let state = createInitialState({ ...defaultGameplayConfig, ...config })
    state.player.y = 100
    state = steps(state, 1, { ...idleInput, frontFire: true })
    state = steps(state, ticks - 2)
    expect(state.projectiles).toHaveLength(1)
    expect(steps(state, 1).projectiles).toHaveLength(0)
  })
  it('freezes projectiles, effects and cooldowns while paused', () => {
    const fired = steps(createInitialState(defaultGameplayConfig), 1, { ...idleInput, frontFire: true })
    const paused = { ...fired, status: 'paused' as const }
    expect(steps(paused, 600, { ...idleInput, frontFire: true })).toBe(paused)
  })
  it('stops attacks at completion and resets weapon state on restart', () => {
    let state = createInitialState({ ...defaultGameplayConfig, sessionTime: 60 })
    state.ticks = 3599
    state.elapsedMs = state.ticks * fixedStepMs
    state = steps(state, 1, { ...idleInput, frontFire: true })
    expect(state.status).toBe('completed')
    expect(state.projectiles).toHaveLength(0)
    expect(steps(state, 60, { ...idleInput, frontFire: true })).toBe(state)
    expect(createInitialState(state.config)).toMatchObject({ projectiles: [], effects: [], nextEntityId: 1,
      cooldowns: { frontFire: 0, leftFire: 0, rightFire: 0 } })
  })
})
