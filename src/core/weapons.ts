import type { GameplayConfig } from './config'
import { arena, arenaContact, circleContact, island, playerRadius, projectileRadius } from './geometry'
import type { Point } from './geometry'

export type Weapon = 'frontFire' | 'leftFire' | 'rightFire'
export type FireInput = Record<Weapon, boolean>
export interface Projectile extends Point {
  id: number
  weapon: Weapon
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
  kind: 'fire' | 'impact'
  heading: number
  expiresAtMs: number
}
export interface WeaponState {
  projectiles: Projectile[]
  effects: WeaponEffect[]
  cooldowns: Record<Weapon, number>
  nextEntityId: number
}

export function createWeaponState(): WeaponState {
  return { projectiles: [], effects: [], cooldowns: { frontFire: 0, leftFire: 0, rightFire: 0 }, nextEntityId: 1 }
}

export function stepWeapons(state: WeaponState, config: Readonly<GameplayConfig>, player: Point & { heading: number },
  input: FireInput, startMs: number, endMs: number): WeaponState {
  let nextEntityId = state.nextEntityId
  const cooldowns = { ...state.cooldowns }
  const projectiles = [...state.projectiles]
  const effects = state.effects.filter((effect) => effect.expiresAtMs > endMs)
  const seconds = (endMs - startMs) / 1000
  for (const weapon of ['frontFire', 'leftFire', 'rightFire'] as const) {
    if (!input[weapon] || startMs + 1e-8 < cooldowns[weapon]) continue
    const front = weapon === 'frontFire'
    const heading = player.heading + (front ? 0 : weapon === 'leftFire' ? -Math.PI / 2 : Math.PI / 2)
    cooldowns[weapon] = startMs + (front ? config.frontFireCooldown : config.sideFireCooldown) * 1000
    for (const offset of front ? [0] : [-16, 0, 16]) {
      const x = player.x + Math.cos(heading) * (playerRadius + projectileRadius + 2) + Math.cos(player.heading) * offset
      const y = player.y + Math.sin(heading) * (playerRadius + projectileRadius + 2) + Math.sin(player.heading) * offset
      projectiles.push({
        id: nextEntityId++, weapon, x, y, heading,
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
    const travel = Math.max(0, Math.min(projectile.speed * seconds, projectile.range - projectile.distance,
      projectile.speed * (projectile.lifetimeMs - projectile.ageMs) / 1000))
    const to = { x: projectile.x + Math.cos(projectile.heading) * travel, y: projectile.y + Math.sin(projectile.heading) * travel }
    const landHit = circleContact(projectile, to, island, island.radius + projectileRadius)
    const edgeHit = arenaContact(projectile, to)
    const contact = Math.min(landHit ?? Infinity, edgeHit ?? Infinity)
    if (Number.isFinite(contact)) {
      effects.push({ id: nextEntityId++, kind: 'impact', heading: projectile.heading,
        x: Math.max(projectileRadius, Math.min(arena.width - projectileRadius, projectile.x + (to.x - projectile.x) * contact)),
        y: Math.max(projectileRadius, Math.min(arena.height - projectileRadius, projectile.y + (to.y - projectile.y) * contact)),
        expiresAtMs: endMs + 180 })
      continue
    }
    const distance = projectile.distance + travel
    const ageMs = projectile.ageMs + seconds * 1000
    if (distance + 1e-8 >= projectile.range || ageMs + 1e-8 >= projectile.lifetimeMs) continue
    survivors.push({ ...projectile, ...to, distance, ageMs })
  }
  return { projectiles: survivors, effects, cooldowns, nextEntityId }
}
