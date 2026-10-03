// Units, defaults, and proposed bounds are documented in docs/specs/gameplay.md.
const parameters = {
  sessionTime: { default: 120, min: 60, max: 180 },
  enemySpawnInterval: { default: 3, min: 1, max: 10 },
  chaserSpawnWeight: { default: 0.5, min: 0.1, max: 0.9 },
  shooterSpawnWeight: { default: 0.5, min: 0.1, max: 0.9 },
  minSpawnDistance: { default: 250, min: 150, max: 400 },
  playerHp: { default: 100, min: 1, max: 500, integer: true },
  chaserHp: { default: 40, min: 1, max: 500, integer: true },
  shooterHp: { default: 60, min: 1, max: 500, integer: true },
  playerMoveSpeed: { default: 180, min: 30, max: 400 },
  chaserMoveSpeed: { default: 100, min: 30, max: 300 },
  shooterMoveSpeed: { default: 80, min: 30, max: 300 },
  playerRotationSpeed: { default: 3, min: 0.5, max: 6 },
  chaserRotationSpeed: { default: 2.5, min: 0.5, max: 6 },
  shooterRotationSpeed: { default: 2, min: 0.5, max: 6 },
  frontProjectileDamage: { default: 20, min: 1, max: 100 },
  sideProjectileDamage: { default: 15, min: 1, max: 100 },
  shooterProjectileDamage: { default: 10, min: 1, max: 100 },
  frontProjectileSpeed: { default: 400, min: 100, max: 800 },
  sideProjectileSpeed: { default: 350, min: 100, max: 800 },
  shooterProjectileSpeed: { default: 250, min: 100, max: 800 },
  frontProjectileRange: { default: 600, min: 100, max: 1200 },
  sideProjectileRange: { default: 450, min: 100, max: 1200 },
  shooterProjectileRange: { default: 500, min: 100, max: 1200 },
  frontProjectileLifetime: { default: 1.5, min: 0.25, max: 5 },
  sideProjectileLifetime: { default: 1.5, min: 0.25, max: 5 },
  shooterProjectileLifetime: { default: 2, min: 0.25, max: 5 },
  frontFireCooldown: { default: 0.35, min: 0.1, max: 3 },
  sideFireCooldown: { default: 1, min: 0.1, max: 3 },
  shooterAttackRange: { default: 400, min: 100, max: 600 },
  shooterFireCooldown: { default: 1.5, min: 0.25, max: 5 },
  chaserCollisionDamage: { default: 25, min: 1, max: 100 },
} as const

export type GameplayConfig = {
  -readonly [Field in keyof typeof parameters]: number
}

export const gameplayOptionLimits = Object.freeze({
  sessionTime: Object.freeze({ min: parameters.sessionTime.min, max: parameters.sessionTime.max }),
  enemySpawnInterval: Object.freeze({
    min: parameters.enemySpawnInterval.min,
    max: parameters.enemySpawnInterval.max,
  }),
})

export interface ConfigValidationIssue {
  field: keyof GameplayConfig | 'config'
  message: string
}

export type ConfigValidationResult =
  | { valid: true; config: Readonly<GameplayConfig> }
  | { valid: false; issues: readonly ConfigValidationIssue[] }

const parameterNames = Object.keys(parameters) as (keyof GameplayConfig)[]

export const defaultGameplayConfig: Readonly<GameplayConfig> = Object.freeze(
  Object.fromEntries(
    parameterNames.map((field) => [field, parameters[field].default]),
  ) as GameplayConfig,
)

/** Validate untrusted input without coercion, returning a detached snapshot. */
export function validateGameplayConfig(input: unknown): ConfigValidationResult {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return {
      valid: false,
      issues: [{ field: 'config', message: 'Configuration must be an object.' }],
    }
  }

  const source = input as Record<string, unknown>
  const config = {} as GameplayConfig
  const issues: ConfigValidationIssue[] = []

  for (const field of parameterNames) {
    const value = source[field]
    const rule = parameters[field]

    if (!Object.hasOwn(source, field) || typeof value !== 'number' || !Number.isFinite(value)) {
      issues.push({ field, message: 'A finite number is required.' })
      continue
    }

    if (value < rule.min || value > rule.max) {
      issues.push({ field, message: `Value must be between ${rule.min} and ${rule.max}.` })
      continue
    }

    if ('integer' in rule && rule.integer && !Number.isInteger(value)) {
      issues.push({ field, message: 'Health must be an integer.' })
      continue
    }

    config[field] = value
  }

  if (issues.length > 0) return { valid: false, issues }

  // Decimal weights can incur small floating-point rounding errors.
  if (Math.abs(config.chaserSpawnWeight + config.shooterSpawnWeight - 1) > 1e-12) {
    issues.push({ field: 'chaserSpawnWeight', message: 'Enemy spawn weights must sum to 1.' })
    issues.push({ field: 'shooterSpawnWeight', message: 'Enemy spawn weights must sum to 1.' })
  }

  const shooterReach = Math.min(
    config.shooterProjectileRange,
    config.shooterProjectileSpeed * config.shooterProjectileLifetime,
  )

  if (config.shooterAttackRange > shooterReach) {
    issues.push({
      field: 'shooterAttackRange',
      message: 'Attack range cannot exceed projectile reach.',
    })
  }

  return issues.length > 0
    ? { valid: false, issues }
    : { valid: true, config: Object.freeze(config) }
}

/** Create the validated configuration snapshot owned by a new match. */
export function createGameplayConfigSnapshot(input: unknown): Readonly<GameplayConfig> {
  const result = validateGameplayConfig(input)
  if (!result.valid) {
    throw new RangeError(
      result.issues.map(({ field, message }) => `${field}: ${message}`).join(' '),
    )
  }
  return result.config
}
