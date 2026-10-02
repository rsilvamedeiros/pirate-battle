import { describe, expect, it } from 'vitest'
import { defaultGameplayConfig } from './config'
import type { Enemy } from './enemies'
import { createInitialState, fixedStepMs, idleInput, stepSimulation } from './simulation'
import { stepWeapons } from './weapons'
import { prepareMatch } from '../engine/scenarios'

describe('damage, scoring and terminal state', () => {
  it('applies one projectile hit once and preserves the previous state', () => {
    const match = prepareMatch({ ...defaultGameplayConfig }, 42, 'front-target')
    const initial = createInitialState(match.config, match.setup)
    let state = stepSimulation(initial, { ...idleInput, frontFire: true })
    for (let i = 0; i < 30; i++) state = stepSimulation(state, idleInput)
    expect(state.enemies[0].hp).toBe(40)
    expect(state.projectiles).toHaveLength(0)
    expect(initial.enemies[0].hp).toBe(60)
    expect(state.score).toBe(0)
  })
  it('scores simultaneous broadside kills once per enemy', () => {
    const match = prepareMatch({ ...defaultGameplayConfig }, 42, 'broadsides')
    let state = createInitialState(match.config, match.setup)
    state = stepSimulation(state, { ...idleInput, leftFire: true, rightFire: true })
    for (let i = 0; i < 20; i++) state = stepSimulation(state, idleInput)
    expect(state.enemies).toHaveLength(0)
    expect(state.score).toBe(2)
    for (let i = 0; i < 30; i++) state = stepSimulation(state, idleInput)
    expect(state.score).toBe(2)
  })
  it('prevents a destroyed Chaser from applying collision damage', () => {
    const match = prepareMatch({ ...defaultGameplayConfig, chaserHp: 20 }, 42, 'chaser-impact')
    const state = stepSimulation(createInitialState(match.config, match.setup), { ...idleInput, frontFire: true })
    expect(state.enemies).toHaveLength(0)
    expect(state.player.hp).toBe(100)
    expect(state.score).toBe(1)
  })
  it('does not damage friendly targets with enemy projectiles', () => {
    const match = prepareMatch({ ...defaultGameplayConfig }, 42, 'shooter-attack')
    const initial = createInitialState(match.config, match.setup)
    const blocker: Enemy = { ...initial.enemies[0], id: 2, x: 230 }
    const projectile = { id: 3, weapon: 'shooterFire' as const, team: 'enemy' as const, x: 254, y: 350, heading: Math.PI,
      speed: 250, damage: 10, range: 500, lifetimeMs: 2000, ageMs: 0, distance: 0 }
    const next = stepWeapons({ ...initial, projectiles: [projectile], nextEntityId: 4 }, initial.config, initial.player, idleInput, 0, 300,
      { enemies: [initial.enemies[0], blocker], playerHp: 100 })
    expect(next.enemies.map(({ hp }) => hp)).toEqual([60, 60])
    expect(next.playerHp).toBe(90)
  })
  it('uses stable IDs to resolve equal-distance target contact', () => {
    const match = prepareMatch({ ...defaultGameplayConfig }, 42, 'front-target')
    const state = createInitialState(match.config, match.setup)
    const target = { ...state.enemies[0], x: 240 }
    const next = stepWeapons(state, state.config, state.player, { ...idleInput, frontFire: true }, 0, fixedStepMs,
      { enemies: [{ ...target, id: 2 }, target], playerHp: 100 })
    expect(next.enemies.find(({ id }) => id === 1)?.hp).toBe(40)
    expect(next.enemies.find(({ id }) => id === 2)?.hp).toBe(60)
  })
  it('ends on lethal contact and freezes all subsequent systems', () => {
    const match = prepareMatch({ ...defaultGameplayConfig }, 42, 'lethal-chaser')
    let state = createInitialState(match.config, match.setup)
    for (let i = 0; i < 6; i++) state = stepSimulation(state, idleInput)
    expect(state).toMatchObject({ status: 'completed', endReason: 'player-death', player: { hp: 0 }, score: 0 })
    expect(stepSimulation(state, { ...idleInput, frontFire: true, forward: true })).toBe(state)
    expect(createInitialState(match.config, match.setup).player.hp).toBe(25)
  })
  it('gives time expiry priority over pending lethal damage at the boundary', () => {
    const match = prepareMatch({ ...defaultGameplayConfig, sessionTime: 60 }, 42, 'lethal-chaser')
    const state = createInitialState(match.config, match.setup)
    state.ticks = 3599; state.elapsedMs = 3599 * fixedStepMs
    state.enemies[0].x = 229
    const next = stepSimulation(state, { ...idleInput, frontFire: true, forward: true })
    expect(next.endReason).toBe('time-expired')
    expect(next.player).toEqual(state.player)
    expect(next.enemies).toEqual(state.enemies)
    expect(next.projectiles).toHaveLength(0)
  })
})
