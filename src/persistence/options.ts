import { defaultGameplayConfig, validateGameplayConfig } from '../core/config'

export const optionsStorageKey = 'pirate-battle.options.v1'

export interface PlayerOptions {
  version: 1
  playerId: string
  playerName: string
  sessionTime: number
  enemySpawnInterval: number
}

export interface OptionsStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface LoadedOptions {
  options: Readonly<PlayerOptions>
  notice: string | null
}

// Access localStorage inside guarded operations: its getter can also throw.
export const browserOptionsStorage: OptionsStorage = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
}

function isPlayerOptions(value: unknown): value is PlayerOptions {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return record.version === 1
    && typeof record.playerId === 'string' && record.playerId.trim().length > 0
    && typeof record.playerName === 'string' && record.playerName.trim().length > 0
    && validateGameplayConfig({
      ...defaultGameplayConfig,
      sessionTime: record.sessionTime,
      enemySpawnInterval: record.enemySpawnInterval,
    }).valid
}

export function savePlayerOptions(storage: OptionsStorage, options: PlayerOptions): boolean {
  if (!isPlayerOptions(options)) return false
  try {
    storage.setItem(optionsStorageKey, JSON.stringify({
      version: options.version,
      playerId: options.playerId,
      playerName: options.playerName,
      sessionTime: options.sessionTime,
      enemySpawnInterval: options.enemySpawnInterval,
    }))
    return true
  } catch {
    return false
  }
}

export function loadPlayerOptions(storage: OptionsStorage, createPlayerId: () => string): LoadedOptions {
  let notice: string | null = null
  try {
    const raw = storage.getItem(optionsStorageKey)
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw)
      if (isPlayerOptions(parsed)) {
        return {
          options: Object.freeze({
            version: parsed.version,
            playerId: parsed.playerId,
            playerName: parsed.playerName,
            sessionTime: parsed.sessionTime,
            enemySpawnInterval: parsed.enemySpawnInterval,
          }),
          notice,
        }
      }
      notice = 'Saved options were invalid. Default settings have been restored.'
    }
  } catch {
    notice = 'Saved options could not be loaded. Default settings are being used.'
  }

  const options: Readonly<PlayerOptions> = Object.freeze({
    version: 1,
    playerId: createPlayerId(),
    playerName: 'Player',
    sessionTime: defaultGameplayConfig.sessionTime,
    enemySpawnInterval: defaultGameplayConfig.enemySpawnInterval,
  })
  if (!savePlayerOptions(storage, options)) {
    notice = 'Browser storage is unavailable. Settings may not survive a refresh.'
  }
  return { options, notice }
}
