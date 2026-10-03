import { expect, it } from 'vitest'
import { defaultGameplayConfig } from '../core/config'
import { createInitialState } from '../core/simulation'
import { createRenderProfiler, profilingConfiguration } from './profiling'

it('records uncapped render intervals and exports detached data without changing rules', () => {
  const state = createInitialState(defaultGameplayConfig)
  const before = structuredClone(state)
  const profiler = createRenderProfiler(() => state, 42)
  profiler.frame(100); profiler.frame(1100)
  expect(profiler.export().frames[1].intervalMs).toBe(1000)
  profiler.export().frames[0].entities.player = 99
  expect(profiler.export().frames[0].entities.player).toBe(1)
  expect(state).toEqual(before)
})
it('excludes paused gaps and records the terminal frame only once', () => {
  let state = createInitialState(defaultGameplayConfig)
  const profiler = createRenderProfiler(() => state, 42)
  profiler.frame(0)
  state = { ...state, status: 'paused' }; profiler.frame(100)
  state = { ...state, status: 'running', elapsedMs: 10 }; profiler.frame(1000)
  expect(profiler.export().frames[1].intervalMs).toBe(0)
  state = { ...state, status: 'completed', elapsedMs: 20 }; profiler.frame(1010); profiler.frame(1020)
  expect(profiler.status()).toMatchObject({ frames: 3, pausedFrames: 1 })
})
it('validates the explicit endurance preset and preserves standard configuration', () => {
  expect(profilingConfiguration(defaultGameplayConfig, false)).toEqual(defaultGameplayConfig)
  expect(profilingConfiguration(defaultGameplayConfig, true)).toMatchObject({ sessionTime: 180, playerHp: 500,
    enemySpawnInterval: 3, chaserCollisionDamage: 1, shooterProjectileDamage: 1 })
  expect(defaultGameplayConfig.playerHp).toBe(100)
})
