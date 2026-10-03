import { describe, expect, it } from 'vitest'
import { defaultGameplayConfig } from './config'
import { enemyRadius, isSafeSpawn, moveEnemies, stepSpawns } from './enemies'
import type { Enemy } from './enemies'
import { island } from './geometry'
import { nextRandom } from './random'
import { createInitialState, idleInput, stepSimulation } from './simulation'
import type { SimulationState } from './simulation'

function enemy(kind: Enemy['kind'], x: number, y: number, heading = 0): Enemy {
  return { id: 1, kind, x, y, heading, hp: kind === 'chaser' ? 40 : 60, nextFireAtMs: 1500 }
}
function advance(state: SimulationState, ticks: number) {
  for (let index = 0; index < ticks; index++) state = stepSimulation(state, idleInput)
  return state
}

describe('seeded enemy simulation', () => {
  it('reproduces random values and normalizes zero without browser randomness', () => {
    expect(nextRandom(0)).toEqual(nextRandom(1))
    expect(nextRandom(42)).toEqual(nextRandom(42))
    expect(nextRandom(42)).not.toEqual(nextRandom(43))
    const next = nextRandom(42)
    expect(next.value).toBeGreaterThanOrEqual(0)
    expect(next.value).toBeLessThan(1)
  })
  it('spawns at the interval and creates both types at safe points', () => {
    const initial = createInitialState(defaultGameplayConfig, { seed: 42 })
    expect(stepSpawns(initial, initial.config, initial.player, 2999).enemies).toHaveLength(0)
    const first = stepSpawns(initial, initial.config, initial.player, 3000)
    expect(first.enemies[0].kind).toBe('chaser')
    expect(isSafeSpawn(first.enemies[0], initial.player, [], initial.config.minSpawnDistance)).toBe(
      true,
    )
    const second = stepSpawns(first, initial.config, initial.player, 6000)
    expect(second.enemies[1].kind).toBe('shooter')
    expect(
      isSafeSpawn(
        second.enemies[1],
        initial.player,
        first.enemies,
        initial.config.minSpawnDistance,
      ),
    ).toBe(true)
    expect(second.nextSpawnAtMs).toBe(9000)
  })
  it('produces the same spawn sequence for the same seed', () => {
    function sequence(seed: number) {
      let state = createInitialState(defaultGameplayConfig, { seed })
      for (let index = 1; index <= 8; index++)
        state = { ...state, ...stepSpawns(state, state.config, state.player, index * 3000) }
      return state.enemies
    }
    expect(sequence(42)).toEqual(sequence(42))
    expect(sequence(42)).not.toEqual(sequence(43))
  })
  it('skips a blocked attempt while preserving the first successful type', () => {
    const state = createInitialState(defaultGameplayConfig)
    const occupied: Enemy[] = []
    for (let y = 40; y <= 660; y += 40)
      for (let x = 40; x <= 960; x += 40)
        occupied.push({ ...enemy('shooter', x, y), id: occupied.length + 1 })
    const skipped = stepSpawns({ ...state, enemies: occupied }, state.config, state.player, 3000)
    expect(skipped.spawnCount).toBe(0)
    expect(skipped.enemies).toHaveLength(occupied.length)
    expect(skipped.nextSpawnAtMs).toBe(6000)
    const recovered = stepSpawns({ ...skipped, enemies: [] }, state.config, state.player, 6000)
    expect(recovered.enemies[0].kind).toBe('chaser')
  })
  it.each([
    { x: 0, y: 0 },
    { x: 500, y: 350 },
    { x: 160, y: 350 },
  ])('rejects unsafe spawn point %j', (point) => {
    expect(isSafeSpawn(point, { x: 150, y: 350 }, [], 250)).toBe(false)
  })
  it('rotates and approaches without exceeding rotation speed', () => {
    const next = moveEnemies(
      [enemy('chaser', 150, 100, 0)],
      { x: 150, y: 350 },
      defaultGameplayConfig,
      1 / 60,
    )[0]
    expect(next.heading).toBeCloseTo(2.5 / 60)
    expect(next.y).toBe(100) // Turns before moving when not facing the route.
  })
  it.each(['chaser', 'shooter'] as const)(
    'routes %s around the island without crossing it',
    (kind) => {
      const config = { ...defaultGameplayConfig, shooterAttackRange: 100 }
      let enemies = [enemy(kind, 750, 350, Math.PI)]
      for (let index = 0; index < 900; index++) {
        enemies = moveEnemies(enemies, { x: 250, y: 350 }, config, 1 / 60)
        expect(Math.hypot(enemies[0].x - island.x, enemies[0].y - island.y)).toBeGreaterThanOrEqual(
          island.radius + enemyRadius - 1e-8,
        )
      }
      expect(enemies[0].x).toBeLessThan(400)
    },
  )
  it('self-destructs a Chaser with one damage event and no score', () => {
    let state = createInitialState(defaultGameplayConfig, {
      enemies: [enemy('chaser', 235, 350, Math.PI)],
    })
    state = advance(state, 6)
    expect(state.enemies).toHaveLength(0)
    expect(state.player.hp).toBe(75)
    expect(state.score).toBe(0)
    expect(advance(state, 60).player.hp).toBe(75)
  })
  it('makes a Shooter respect range, alignment and the initial cooldown', () => {
    let state = createInitialState(defaultGameplayConfig, {
      enemies: [enemy('shooter', 300, 350, Math.PI)],
    })
    state = advance(state, 89)
    expect(state.projectiles).toHaveLength(0)
    state = advance(state, 1)
    expect(state.projectiles[0]).toMatchObject({ team: 'enemy', damage: 10, speed: 250 })
    state = advance(state, 18)
    expect(state.player.hp).toBe(90)
    expect(state.projectiles).toHaveLength(0)
    const far = createInitialState(defaultGameplayConfig, {
      enemies: [enemy('shooter', 900, 100, Math.PI)],
    })
    expect(advance(far, 90).projectiles).toHaveLength(0)
  })
  it('blocks Shooter shots on the island before damaging the player', () => {
    const state = createInitialState(defaultGameplayConfig, {
      player: { x: 330, y: 350, heading: 0 },
      enemies: [enemy('shooter', 670, 350, Math.PI)],
    })
    const next = advance(state, 144)
    expect(next.player.hp).toBe(100)
    expect(next.projectiles).toHaveLength(0)
  })
  it('freezes enemy scheduling and all entities during pause', () => {
    const state = { ...createInitialState(defaultGameplayConfig), status: 'paused' as const }
    expect(advance(state, 600)).toBe(state)
  })
  it('restores seed, spawn schedule and empty enemies on a fresh match', () => {
    const initial = createInitialState(defaultGameplayConfig, { seed: 42 })
    expect(advance(initial, 360).spawnCount).toBe(2)
    expect(createInitialState(defaultGameplayConfig, { seed: 42 })).toEqual(initial)
  })
})
