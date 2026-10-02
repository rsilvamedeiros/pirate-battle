import type { GameplayConfig } from './config'
import { arena, arenaContact, circleContact, island, playerRadius, projectileRadius } from './geometry'
import type { Point } from './geometry'
import { enemyRadius } from './enemies'
import type { Enemy } from './enemies'

export type Weapon = 'frontFire' | 'leftFire' | 'rightFire'
export type FireInput = Record<Weapon, boolean>
export interface Projectile extends Point {
  id: number
  weapon: Weapon | 'shooterFire'
  team: 'player' | 'enemy'
  heading: number
  speed: number
  damage: number
  range: number
  lifetimeMs: number
  ageMs: number
  distance: number
}
export interface WeaponEffect extends Point {
  id: number
  kind: 'fire' | 'impact' | 'damage' | 'destruction'
  heading: number
  expiresAtMs: number
}
export interface WeaponState {
  projectiles: Projectile[]
  effects: WeaponEffect[]
  cooldowns: Record<Weapon, number>
  nextEntityId: number
}
export interface CombatTargets { enemies: Enemy[]; playerHp: number }

export function createWeaponState(): WeaponState {
  return { projectiles: [], effects: [], cooldowns: { frontFire: 0, leftFire: 0, rightFire: 0 }, nextEntityId: 1 }
}

export function stepWeapons(state: WeaponState, config: Readonly<GameplayConfig>, player: Point & { heading: number },
  input: FireInput, startMs: number, endMs: number, targets: CombatTargets = { enemies: [], playerHp: config.playerHp }) {
  let nextEntityId = state.nextEntityId
  const cooldowns = { ...state.cooldowns }
  const projectiles = [...state.projectiles]
  const effects = state.effects.filter((effect) => effect.expiresAtMs > endMs)
  const seconds = (endMs - startMs) / 1000
  const alive = new Map(targets.enemies.map((enemy) => [enemy.id, enemy]))
  let playerHp = targets.playerHp
  let scoreDelta = 0
  for (const weapon of ['frontFire', 'leftFire', 'rightFire'] as const) {
    if (!input[weapon] || startMs + 1e-8 < cooldowns[weapon]) continue
    const front = weapon === 'frontFire'
    const heading = player.heading + (front ? 0 : weapon === 'leftFire' ? -Math.PI / 2 : Math.PI / 2)
    cooldowns[weapon] = startMs + (front ? config.frontFireCooldown : config.sideFireCooldown) * 1000
    for (const offset of front ? [0] : [-16, 0, 16]) {
      const x = player.x + Math.cos(heading) * (playerRadius + projectileRadius + 2) + Math.cos(player.heading) * offset
      const y = player.y + Math.sin(heading) * (playerRadius + projectileRadius + 2) + Math.sin(player.heading) * offset
      projectiles.push({
        id: nextEntityId++, weapon, team: 'player', x, y, heading,
        speed: front ? config.frontProjectileSpeed : config.sideProjectileSpeed,
        damage: front ? config.frontProjectileDamage : config.sideProjectileDamage,
        range: front ? config.frontProjectileRange : config.sideProjectileRange,
        lifetimeMs: (front ? config.frontProjectileLifetime : config.sideProjectileLifetime) * 1000,
        ageMs: 0, distance: 0,
      })
      effects.push({ id: nextEntityId++, kind: 'fire', x, y, heading, expiresAtMs: endMs + 120 })
    }
  }
  const survivors: Projectile[] = []
  for (const projectile of projectiles) {
    if (playerHp <= 0) { survivors.push(projectile); continue }
    const travel = Math.max(0, Math.min(projectile.speed * seconds, projectile.range - projectile.distance,
      projectile.speed * (projectile.lifetimeMs - projectile.ageMs) / 1000))
    const to = { x: projectile.x + Math.cos(projectile.heading) * travel, y: projectile.y + Math.sin(projectile.heading) * travel }
    const landHit = circleContact(projectile, to, island, island.radius + projectileRadius)
    const edgeHit = arenaContact(projectile, to)
    const obstacle = Math.min(landHit ?? Infinity, edgeHit ?? Infinity)
    let targetHit = Infinity
    let enemyHit: Enemy | undefined
    if (projectile.team === 'enemy') targetHit = circleContact(projectile, to, player, playerRadius + projectileRadius) ?? Infinity
    else for (const enemy of alive.values()) {
      const hit = circleContact(projectile, to, enemy, enemyRadius + projectileRadius)
      if (hit !== null && (hit < targetHit - 1e-8 || (Math.abs(hit - targetHit) < 1e-8 && enemy.id < (enemyHit?.id ?? Infinity)))) {
        targetHit = hit; enemyHit = enemy
      }
    }
    const contact = Math.min(obstacle, targetHit)
    if (Number.isFinite(contact)) {
      const hitsTarget = targetHit < obstacle - 1e-8
      effects.push({ id: nextEntityId++, kind: hitsTarget ? 'damage' : 'impact', heading: projectile.heading,
        x: Math.max(projectileRadius, Math.min(arena.width - projectileRadius, projectile.x + (to.x - projectile.x) * contact)),
        y: Math.max(projectileRadius, Math.min(arena.height - projectileRadius, projectile.y + (to.y - projectile.y) * contact)),
        expiresAtMs: endMs + 180 })
      if (hitsTarget) {
        if (projectile.team === 'enemy') playerHp = Math.max(0, playerHp - projectile.damage)
        else if (enemyHit) {
          const hp = Math.max(0, enemyHit.hp - projectile.damage)
          if (hp > 0) alive.set(enemyHit.id, { ...enemyHit, hp })
          else {
            alive.delete(enemyHit.id)
            scoreDelta++
            effects.push({ id: nextEntityId++, kind: 'destruction', x: enemyHit.x, y: enemyHit.y,
              heading: enemyHit.heading, expiresAtMs: endMs + 400 })
          }
        }
        if (playerHp <= 0) effects.push({ id: nextEntityId++, kind: 'destruction', ...player, expiresAtMs: endMs + 400 })
      }
      continue
    }
    const distance = projectile.distance + travel
    const ageMs = projectile.ageMs + seconds * 1000
    if (distance + 1e-8 >= projectile.range || ageMs + 1e-8 >= projectile.lifetimeMs) continue
    survivors.push({ ...projectile, ...to, distance, ageMs })
  }
  return { projectiles: survivors, effects, cooldowns, nextEntityId, enemies: [...alive.values()], playerHp, scoreDelta }
}
