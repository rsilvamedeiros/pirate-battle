import type { SimulationState } from '../core/simulation'
import { createGameplayConfigSnapshot } from '../core/config'
import type { GameplayConfig } from '../core/config'

export interface EntityCounts {
  player: number
  chasers: number
  shooters: number
  projectiles: number
  effects: number
  total: number
}
export interface RenderSample {
  wallMs: number
  activeMs: number
  intervalMs: number
  entities: EntityCounts
}
export function countEntities(state: SimulationState): EntityCounts {
  const player = state.player.hp > 0 ? 1 : 0
  const chasers = state.enemies.filter((enemy) => enemy.kind === 'chaser').length
  const shooters = state.enemies.length - chasers
  const projectiles = state.projectiles.length,
    effects = state.effects.length
  return {
    player,
    chasers,
    shooters,
    projectiles,
    effects,
    total: player + chasers + shooters + projectiles + effects,
  }
}

/** An explicitly selected, validated preset; damage, spawns and real time stay enabled. */
export function profilingConfiguration(config: GameplayConfig, endurance: boolean) {
  return createGameplayConfigSnapshot(
    endurance
      ? {
          ...config,
          sessionTime: 180,
          playerHp: 500,
          chaserCollisionDamage: 1,
          shooterProjectileDamage: 1,
        }
      : config,
  )
}

/** Observe post-render timestamps without changing simulation or input. */
export function createRenderProfiler(read: () => SimulationState, seed: number) {
  const frames: RenderSample[] = []
  let origin: number | null = null,
    previous: number | null = null
  let pausedFrames = 0,
    truncated = false
  const limit = 120000
  return {
    frame(now: number) {
      const state = read()
      if (state.status === 'paused') {
        previous = null
        pausedFrames++
        return
      }
      if (state.status === 'completed' && frames.at(-1)?.activeMs === state.elapsedMs) return
      origin ??= now
      if (frames.length >= limit) {
        truncated = true
        return
      }
      frames.push({
        wallMs: now - origin,
        activeMs: state.elapsedMs,
        intervalMs: previous === null ? 0 : now - previous,
        entities: countEntities(state),
      })
      previous = now
    },
    status() {
      const state = read()
      return {
        status: state.status,
        activeMs: state.elapsedMs,
        endReason: state.endReason,
        frames: frames.length,
        pausedFrames,
        truncated,
        entities: countEntities(state),
      }
    },
    export() {
      return {
        version: 1,
        seed,
        config: { ...read().config },
        ...this.status(),
        frames: structuredClone(frames),
      }
    },
  }
}
export type RenderProfiler = ReturnType<typeof createRenderProfiler>
declare global {
  interface Window {
    __profiling?: Pick<RenderProfiler, 'status' | 'export'>
  }
}
