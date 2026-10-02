import { createGameplayConfigSnapshot } from './config'
import type { GameplayConfig } from './config'
import { arena, island, playerRadius } from './geometry'
import { createWeaponState, stepWeapons } from './weapons'
import type { FireInput, WeaponState } from './weapons'

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
}

export function createInitialState(config: GameplayConfig): SimulationState {
  return {
    ...createWeaponState(),
    config: createGameplayConfigSnapshot(config),
    player: { x: 150, y: 350, heading: 0, hp: config.playerHp },
    ticks: 0,
    elapsedMs: 0,
    score: 0,
    status: 'running',
  }
}

export function stepSimulation(state: SimulationState, input: GameInput): SimulationState {
  if (state.status !== 'running') return state
  const elapsedMs = Math.min((state.ticks + 1) * fixedStepMs, state.config.sessionTime * 1000)
  const seconds = (elapsedMs - state.elapsedMs) / 1000
  const heading = state.player.heading + (Number(input.right) - Number(input.left)) * state.config.playerRotationSpeed * seconds
  const distance = input.forward ? state.config.playerMoveSpeed * seconds : 0
  const x = Math.max(playerRadius, Math.min(arena.width - playerRadius, state.player.x + Math.cos(heading) * distance))
  const y = Math.max(playerRadius, Math.min(arena.height - playerRadius, state.player.y + Math.sin(heading) * distance))
  // At the configured maximum speed a fixed step travels < 7 lu, so a step
  // cannot tunnel through this 200 lu island. Reject overlapping movement.
  const blocked = Math.hypot(x - island.x, y - island.y) < island.radius + playerRadius
  const player = { ...state.player, x: blocked ? state.player.x : x, y: blocked ? state.player.y : y, heading }
  // Time exhaustion takes precedence in this increment; no new shot at completion.
  const weapons = elapsedMs >= state.config.sessionTime * 1000 ? state
    : stepWeapons(state, state.config, player, input, state.elapsedMs, elapsedMs)
  return {
    ...state,
    projectiles: weapons.projectiles, effects: weapons.effects, cooldowns: weapons.cooldowns, nextEntityId: weapons.nextEntityId,
    player,
    ticks: state.ticks + 1,
    elapsedMs,
    status: elapsedMs >= state.config.sessionTime * 1000 ? 'completed' : 'running',
  }
}
