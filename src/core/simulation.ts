import { createGameplayConfigSnapshot } from './config'
import type { GameplayConfig } from './config'
import { arena, island, playerRadius } from './geometry'
import { createWeaponState, stepWeapons } from './weapons'
import type { FireInput, WeaponState } from './weapons'
import { aimingTolerance, angleDifference, enemyRadius, moveEnemies, stepSpawns } from './enemies'
import type { Enemy } from './enemies'
import { normalizeSeed } from './random'

export { arena, island, playerRadius } from './geometry'

export const fixedStepMs = 1000 / 60

export interface MovementInput {
  forward: boolean
  left: boolean
  right: boolean
}
export type GameInput = MovementInput & FireInput
export const idleInput: GameInput = { forward: false, left: false, right: false, frontFire: false, leftFire: false, rightFire: false }

export interface SimulationState extends WeaponState {
  config: Readonly<GameplayConfig>
  player: { x: number; y: number; heading: number; hp: number }
  ticks: number
  elapsedMs: number
  score: number
  status: 'running' | 'paused' | 'completed'
  endReason: 'time-expired' | 'player-death' | null
  enemies: Enemy[]
  randomState: number
  seed: number
  spawnCount: number
  nextSpawnAtMs: number
}

export interface InitialSetup { seed?: number; enemies?: Enemy[]; player?: { x: number; y: number; heading: number } }

export function createInitialState(config: GameplayConfig, setup: InitialSetup = {}): SimulationState {
  const enemies = (setup.enemies ?? []).map((enemy) => ({ ...enemy }))
  return {
    ...createWeaponState(),
    enemies, seed: normalizeSeed(setup.seed ?? 1), randomState: normalizeSeed(setup.seed ?? 1), spawnCount: 0,
    nextSpawnAtMs: config.enemySpawnInterval * 1000,
    nextEntityId: Math.max(0, ...enemies.map(({ id }) => id)) + 1,
    config: createGameplayConfigSnapshot(config),
    player: { x: 150, y: 350, heading: 0, ...setup.player, hp: config.playerHp },
    ticks: 0,
    elapsedMs: 0,
    score: 0,
    status: 'running',
    endReason: null,
  }
}

export function stepSimulation(state: SimulationState, input: GameInput): SimulationState {
  if (state.status !== 'running') return state
  const elapsedMs = Math.min((state.ticks + 1) * fixedStepMs, state.config.sessionTime * 1000)
  if (elapsedMs >= state.config.sessionTime * 1000) return {
    ...state, elapsedMs, ticks: state.ticks + 1, status: 'completed', endReason: 'time-expired',
  }
  const seconds = (elapsedMs - state.elapsedMs) / 1000
  const heading = state.player.heading + (Number(input.right) - Number(input.left)) * state.config.playerRotationSpeed * seconds
  const distance = input.forward ? state.config.playerMoveSpeed * seconds : 0
  const x = Math.max(playerRadius, Math.min(arena.width - playerRadius, state.player.x + Math.cos(heading) * distance))
  const y = Math.max(playerRadius, Math.min(arena.height - playerRadius, state.player.y + Math.sin(heading) * distance))
  // At the configured maximum speed a fixed step travels < 7 lu, so a step
  // cannot tunnel through this 200 lu island. Reject overlapping movement.
  const blocked = Math.hypot(x - island.x, y - island.y) < island.radius + playerRadius
  const player = { ...state.player, x: blocked ? state.player.x : x, y: blocked ? state.player.y : y, heading }
  const spawned = stepSpawns(state, state.config, player, elapsedMs)
  const enemies = moveEnemies(spawned.enemies, player, state.config, seconds)
  const weapons = stepWeapons({ ...state, nextEntityId: spawned.nextEntityId }, state.config, player, input,
    state.elapsedMs, elapsedMs, { enemies, playerHp: player.hp })
  const next: SimulationState = {
    ...state,
    randomState: spawned.randomState, spawnCount: spawned.spawnCount, nextSpawnAtMs: spawned.nextSpawnAtMs,
    projectiles: weapons.projectiles, effects: weapons.effects, cooldowns: weapons.cooldowns, nextEntityId: weapons.nextEntityId,
    enemies: weapons.enemies, score: state.score + weapons.scoreDelta, player: { ...player, hp: weapons.playerHp },
    ticks: state.ticks + 1,
    elapsedMs,
    status: 'running',
  }
  if (next.player.hp > 0) for (const enemy of [...next.enemies].sort((a, b) => a.id - b.id)) {
    if (enemy.kind !== 'chaser' || Math.hypot(enemy.x - player.x, enemy.y - player.y) > enemyRadius + playerRadius) continue
    next.enemies = next.enemies.filter(({ id }) => id !== enemy.id)
    next.player.hp = Math.max(0, next.player.hp - state.config.chaserCollisionDamage)
    next.effects.push({ id: next.nextEntityId++, kind: 'destruction', x: enemy.x, y: enemy.y, heading: enemy.heading, expiresAtMs: elapsedMs + 400 })
    next.effects.push({ id: next.nextEntityId++, kind: 'damage', x: player.x, y: player.y, heading, expiresAtMs: elapsedMs + 180 })
    if (next.player.hp <= 0) {
      next.effects.push({ id: next.nextEntityId++, kind: 'destruction', x: player.x, y: player.y, heading, expiresAtMs: elapsedMs + 400 })
      break
    }
  }
  if (next.player.hp <= 0) return { ...next, status: 'completed', endReason: 'player-death' }
  next.enemies = next.enemies.map((enemy) => {
    const targetHeading = Math.atan2(player.y - enemy.y, player.x - enemy.x)
    if (enemy.kind !== 'shooter' || elapsedMs + 1e-8 < enemy.nextFireAtMs
      || Math.hypot(player.x - enemy.x, player.y - enemy.y) > state.config.shooterAttackRange
      || Math.abs(angleDifference(targetHeading, enemy.heading)) > aimingTolerance) return enemy
    const x = enemy.x + Math.cos(enemy.heading) * 46
    const y = enemy.y + Math.sin(enemy.heading) * 46
    next.projectiles.push({ id: next.nextEntityId++, weapon: 'shooterFire', team: 'enemy', x, y, heading: enemy.heading,
      speed: state.config.shooterProjectileSpeed, damage: state.config.shooterProjectileDamage, range: state.config.shooterProjectileRange,
      lifetimeMs: state.config.shooterProjectileLifetime * 1000, ageMs: 0, distance: 0 })
    next.effects.push({ id: next.nextEntityId++, kind: 'fire', x, y, heading: enemy.heading, expiresAtMs: elapsedMs + 120 })
    return { ...enemy, nextFireAtMs: elapsedMs + state.config.shooterFireCooldown * 1000 }
  })
  return next
}
