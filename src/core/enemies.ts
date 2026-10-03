import type { GameplayConfig } from './config'
import { arena, circleContact, island, playerRadius } from './geometry'
import type { Point } from './geometry'
import { nextRandom } from './random'

export const enemyRadius = 40
export const aimingTolerance = 0.15
export type EnemyKind = 'chaser' | 'shooter'
export interface Enemy extends Point {
  id: number
  kind: EnemyKind
  heading: number
  hp: number
  nextFireAtMs: number
}
export interface SpawnState {
  enemies: Enemy[]
  randomState: number
  spawnCount: number
  nextSpawnAtMs: number
  nextEntityId: number
}

export function isSafeSpawn(
  point: Point,
  player: Point,
  enemies: readonly Enemy[],
  minDistance: number,
): boolean {
  return (
    point.x >= enemyRadius &&
    point.x <= arena.width - enemyRadius &&
    point.y >= enemyRadius &&
    point.y <= arena.height - enemyRadius &&
    Math.hypot(point.x - island.x, point.y - island.y) >= island.radius + enemyRadius &&
    Math.hypot(point.x - player.x, point.y - player.y) >=
      Math.max(minDistance, enemyRadius + playerRadius) &&
    enemies.every((enemy) => Math.hypot(point.x - enemy.x, point.y - enemy.y) >= 2 * enemyRadius)
  )
}

export function stepSpawns(
  state: SpawnState,
  config: Readonly<GameplayConfig>,
  player: Point,
  endMs: number,
): SpawnState {
  if (endMs + 1e-8 < state.nextSpawnAtMs) return state
  let randomState = state.randomState
  function random() {
    const next = nextRandom(randomState)
    randomState = next.state
    return next.value
  }
  const kind: EnemyKind =
    state.spawnCount === 0
      ? 'chaser'
      : state.spawnCount === 1
        ? 'shooter'
        : random() < config.chaserSpawnWeight
          ? 'chaser'
          : 'shooter'
  let point: Point | undefined
  for (let attempt = 0; attempt < 32; attempt++) {
    const candidate = {
      x: enemyRadius + random() * (arena.width - 2 * enemyRadius),
      y: enemyRadius + random() * (arena.height - 2 * enemyRadius),
    }
    if (isSafeSpawn(candidate, player, state.enemies, config.minSpawnDistance)) {
      point = candidate
      break
    }
  }
  // A bounded grid fallback improves safe availability without weakening checks.
  if (!point)
    for (let y = enemyRadius; y <= arena.height - enemyRadius && !point; y += 80) {
      for (let x = enemyRadius; x <= arena.width - enemyRadius; x += 80) {
        const candidate = { x, y }
        if (isSafeSpawn(candidate, player, state.enemies, config.minSpawnDistance)) {
          point = candidate
          break
        }
      }
    }
  return {
    ...state,
    randomState,
    nextSpawnAtMs: state.nextSpawnAtMs + config.enemySpawnInterval * 1000,
    spawnCount: state.spawnCount + Number(Boolean(point)),
    nextEntityId: state.nextEntityId + Number(Boolean(point)),
    enemies: point
      ? [
          ...state.enemies,
          {
            ...point,
            id: state.nextEntityId,
            kind,
            heading: Math.atan2(player.y - point.y, player.x - point.x),
            hp: kind === 'chaser' ? config.chaserHp : config.shooterHp,
            nextFireAtMs: endMs + config.shooterFireCooldown * 1000,
          },
        ]
      : state.enemies,
  }
}

export function angleDifference(target: number, current: number): number {
  return Math.atan2(Math.sin(target - current), Math.cos(target - current))
}

const waypoints = Array.from({ length: 16 }, (_, index) => ({
  x: island.x + Math.cos((index * Math.PI) / 8) * 160,
  y: island.y + Math.sin((index * Math.PI) / 8) * 160,
}))
const ringEdgeLength = Math.hypot(waypoints[0].x - waypoints[1].x, waypoints[0].y - waypoints[1].y)
function clearPath(from: Point, to: Point): boolean {
  return circleContact(from, to, island, island.radius + enemyRadius - 1e-6) === null
}

/** Routes along a conservative polygon around the island when the direct path is blocked. */
export function navigationTarget(from: Point, target: Point): Point {
  if (clearPath(from, target)) return target
  let best = Infinity
  let result = target
  for (let start = 0; start < waypoints.length; start++) {
    if (!clearPath(from, waypoints[start])) continue
    for (let end = 0; end < waypoints.length; end++) {
      if (!clearPath(waypoints[end], target)) continue
      const offset = Math.abs(start - end)
      const cost =
        Math.hypot(from.x - waypoints[start].x, from.y - waypoints[start].y) +
        Math.min(offset, 16 - offset) * ringEdgeLength +
        Math.hypot(target.x - waypoints[end].x, target.y - waypoints[end].y)
      if (cost < best) {
        best = cost
        result = waypoints[start]
      }
    }
  }
  return result
}

export function moveEnemies(
  enemies: readonly Enemy[],
  player: Point,
  config: Readonly<GameplayConfig>,
  seconds: number,
): Enemy[] {
  return enemies
    .filter(({ hp }) => hp > 0)
    .map((enemy) => {
      const inRange =
        enemy.kind === 'shooter' &&
        Math.hypot(player.x - enemy.x, player.y - enemy.y) <= config.shooterAttackRange
      const target = inRange ? player : navigationTarget(enemy, player)
      const desired = Math.atan2(target.y - enemy.y, target.x - enemy.x)
      const turn =
        (enemy.kind === 'chaser' ? config.chaserRotationSpeed : config.shooterRotationSpeed) *
        seconds
      const heading =
        enemy.heading + Math.max(-turn, Math.min(turn, angleDifference(desired, enemy.heading)))
      const speed = enemy.kind === 'chaser' ? config.chaserMoveSpeed : config.shooterMoveSpeed
      const travel =
        inRange || Math.abs(angleDifference(desired, heading)) > Math.PI / 3 ? 0 : speed * seconds
      const x = Math.max(
        enemyRadius,
        Math.min(arena.width - enemyRadius, enemy.x + Math.cos(heading) * travel),
      )
      const y = Math.max(
        enemyRadius,
        Math.min(arena.height - enemyRadius, enemy.y + Math.sin(heading) * travel),
      )
      const blocked = Math.hypot(x - island.x, y - island.y) < island.radius + enemyRadius
      return { ...enemy, heading, x: blocked ? enemy.x : x, y: blocked ? enemy.y : y }
    })
}
