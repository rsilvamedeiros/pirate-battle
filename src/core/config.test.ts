import { describe, expect, it } from 'vitest'
import {
  createGameplayConfigSnapshot,
  defaultGameplayConfig,
  validateGameplayConfig,
} from './config'
import type { GameplayConfig } from './config'

// Independent examples from the specification, not values read from validators.
const optionBoundaries = [
  { sessionTime: 60, enemySpawnInterval: 1 },
  { sessionTime: 180, enemySpawnInterval: 10 },
]

describe('gameplay configuration', () => {
  it('accepts the documented defaults', () => {
    expect(validateGameplayConfig(defaultGameplayConfig).valid).toBe(true)
    expect(defaultGameplayConfig).toMatchObject({
      sessionTime: 120,
      enemySpawnInterval: 3,
      playerHp: 100,
      chaserHp: 40,
      shooterHp: 60,
      frontFireCooldown: 0.35,
      sideFireCooldown: 1,
    })
    expect(Object.keys(defaultGameplayConfig)).toHaveLength(31)
    expect(Object.isFrozen(defaultGameplayConfig)).toBe(true)
  })

  it.each(optionBoundaries)('accepts option boundaries: $sessionTime s / $enemySpawnInterval s', (options) => {
    expect(validateGameplayConfig({ ...defaultGameplayConfig, ...options }).valid).toBe(true)
  })

  it.each([
    ['sessionTime', 59], ['sessionTime', 181],
    ['enemySpawnInterval', 0], ['enemySpawnInterval', -1],
    ['enemySpawnInterval', 0.5], ['enemySpawnInterval', 11],
    ['minSpawnDistance', 149], ['minSpawnDistance', 401],
    ['playerMoveSpeed', 0], ['chaserRotationSpeed', 7],
    ['frontProjectileDamage', 101], ['sideProjectileSpeed', 99],
    ['frontProjectileRange', 1201], ['sideProjectileLifetime', 0],
    ['frontFireCooldown', 0], ['sideFireCooldown', 4],
    ['shooterFireCooldown', 0], ['chaserCollisionDamage', 0],
  ] satisfies [keyof GameplayConfig, number][])('rejects invalid %s = %s', (field, value) => {
    const result = validateGameplayConfig({ ...defaultGameplayConfig, [field]: value })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ field })]))
  })

  it.each([NaN, Infinity, -Infinity, '120', '', undefined, null, true])('rejects nonnumeric or nonfinite input: %s', (value) => {
    expect(validateGameplayConfig({ ...defaultGameplayConfig, sessionTime: value }).valid).toBe(false)
  })

  it.each([null, undefined, [], 120, 'config'])('rejects invalid configuration containers: %s', (input) => {
    const result = validateGameplayConfig(input)
    expect(result).toEqual({
      valid: false,
      issues: [{ field: 'config', message: 'Configuration must be an object.' }],
    })
  })

  it('requires every gameplay field to be supplied', () => {
    const input: Partial<GameplayConfig> = { ...defaultGameplayConfig }
    delete input.shooterHp
    expect(validateGameplayConfig(input).valid).toBe(false)
  })

  it('does not accept inherited configuration fields', () => {
    expect(validateGameplayConfig(Object.create(defaultGameplayConfig)).valid).toBe(false)
  })

  it.each(['playerHp', 'chaserHp', 'shooterHp'] as const)('requires integer %s', (field) => {
    expect(validateGameplayConfig({ ...defaultGameplayConfig, [field]: 1 }).valid).toBe(true)
    expect(validateGameplayConfig({ ...defaultGameplayConfig, [field]: 500 }).valid).toBe(true)
    expect(validateGameplayConfig({ ...defaultGameplayConfig, [field]: 40.5 }).valid).toBe(false)
  })

  it.each([[0.1, 0.9], [0.9, 0.1], [0.3, 0.7]])('accepts normalized weights %s / %s', (chaserSpawnWeight, shooterSpawnWeight) => {
    expect(validateGameplayConfig({ ...defaultGameplayConfig, chaserSpawnWeight, shooterSpawnWeight }).valid).toBe(true)
  })

  it.each([[0.5, 0.4], [0.9, 0.9], [0, 1], [1, 0]])('rejects invalid weights %s / %s', (chaserSpawnWeight, shooterSpawnWeight) => {
    expect(validateGameplayConfig({ ...defaultGameplayConfig, chaserSpawnWeight, shooterSpawnWeight }).valid).toBe(false)
  })

  it('rejects shooter attack range beyond projectile range', () => {
    expect(validateGameplayConfig({
      ...defaultGameplayConfig,
      shooterProjectileRange: 300,
      shooterAttackRange: 400,
    }).valid).toBe(false)
  })

  it('rejects shooter attack range beyond lifetime reach', () => {
    expect(validateGameplayConfig({
      ...defaultGameplayConfig,
      shooterProjectileLifetime: 1,
      shooterAttackRange: 400,
    }).valid).toBe(false)
  })

  it('accepts attack range exactly at projectile reach', () => {
    expect(validateGameplayConfig({
      ...defaultGameplayConfig,
      shooterProjectileSpeed: 200,
      shooterProjectileLifetime: 2,
      shooterProjectileRange: 400,
      shooterAttackRange: 400,
    }).valid).toBe(true)
  })

  it('creates independent immutable configuration snapshots', () => {
    const input = { ...defaultGameplayConfig }
    const first = createGameplayConfigSnapshot(input)
    input.sessionTime = 180
    const second = createGameplayConfigSnapshot(input)

    expect(first.sessionTime).toBe(120)
    expect(second.sessionTime).toBe(180)
    expect(first).not.toBe(second)
    expect(Object.isFrozen(first)).toBe(true)
    expect(Reflect.set(first, 'sessionTime', 60)).toBe(false)
    expect(first.sessionTime).toBe(120)
  })

  it('refuses to create a snapshot from invalid settings', () => {
    expect(() => createGameplayConfigSnapshot({ ...defaultGameplayConfig, sessionTime: 0 }))
      .toThrow(RangeError)
  })

  it('keeps unrelated input fields out of the match snapshot', () => {
    const config = createGameplayConfigSnapshot({ ...defaultGameplayConfig, playerName: 'Player' })
    expect(config).not.toHaveProperty('playerName')
  })
})
