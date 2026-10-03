import type { GameplayConfig } from '../core/config'
import type { Enemy } from '../core/enemies'
import type { InitialSetup } from '../core/simulation'

export const combatFixtures = [
  'front-target',
  'broadsides',
  'chaser-impact',
  'shooter-attack',
  'island-cover',
  'lethal-chaser',
  'time-expiry',
] as const
export type CombatFixture = (typeof combatFixtures)[number]

/** Prepare a match before it starts; never mutate outcomes in a running match. */
export function prepareMatch(
  config: GameplayConfig,
  seed: number,
  fixture?: string | null,
): { config: GameplayConfig; setup: InitialSetup } {
  const setup: InitialSetup = { seed }
  const next = { ...config }
  function enemy(id: number, kind: Enemy['kind'], x: number, y: number, heading: number): Enemy {
    return {
      id,
      kind,
      x,
      y,
      heading,
      hp: kind === 'chaser' ? next.chaserHp : next.shooterHp,
      nextFireAtMs: next.shooterFireCooldown * 1000,
    }
  }
  switch (fixture) {
    case 'front-target':
      next.shooterAttackRange = 100
      setup.enemies = [enemy(1, 'shooter', 320, 350, Math.PI)]
      break
    case 'broadsides':
      next.shooterHp = 30
      setup.enemies = [
        enemy(1, 'shooter', 150, 200, Math.PI / 2),
        enemy(2, 'shooter', 150, 500, -Math.PI / 2),
      ]
      break
    case 'chaser-impact':
      setup.enemies = [enemy(1, 'chaser', 235, 350, Math.PI)]
      break
    case 'shooter-attack':
      setup.enemies = [enemy(1, 'shooter', 300, 350, Math.PI)]
      break
    case 'island-cover':
      setup.player = { x: 330, y: 350, heading: 0 }
      setup.enemies = [enemy(1, 'shooter', 670, 350, Math.PI)]
      break
    case 'lethal-chaser':
      next.playerHp = 25
      setup.enemies = [enemy(1, 'chaser', 235, 350, Math.PI)]
      break
    case 'time-expiry':
      next.playerHp = 500
      next.chaserCollisionDamage = next.shooterProjectileDamage = 1
      next.enemySpawnInterval = 10
      break
  }
  return { config: next, setup }
}
