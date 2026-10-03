import { Application, Assets, Graphics, Sprite } from 'pixi.js'
import type { Texture } from 'pixi.js'
import { arena, island } from '../core/simulation'
import type { GameEngine } from '../engine/game-engine'

const shipUrl = `${import.meta.env.BASE_URL}assets/png/default/ships/ship_1.png`
const projectileUrl = `${import.meta.env.BASE_URL}assets/png/default/ship_parts/cannon_ball.png`
const fireUrl = `${import.meta.env.BASE_URL}assets/png/default/effects/fire_1.png`
const impactUrl = `${import.meta.env.BASE_URL}assets/png/default/effects/explosion_1.png`
const chaserUrl = `${import.meta.env.BASE_URL}assets/png/default/ships/ship_2.png`
const shooterUrl = `${import.meta.env.BASE_URL}assets/png/default/ships/ship_3.png`

export async function createArenaView(
  host: HTMLDivElement,
  engine: GameEngine,
  manualClock: boolean,
  onRender?: (now: number) => void,
) {
  const [texture, projectileTexture, fireTexture, impactTexture, chaserTexture, shooterTexture] =
    await Promise.all(
      [shipUrl, projectileUrl, fireUrl, impactUrl, chaserUrl, shooterUrl].map((url) =>
        Assets.load<Texture>(url),
      ),
    )
  const app = new Application()
  try {
    await app.init({
      width: arena.width,
      height: arena.height,
      background: 0x238598,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: true,
      autoStart: false,
      sharedTicker: false,
    })
  } catch (error) {
    if (app.renderer) app.destroy(true, { children: true })
    throw error
  }
  app.canvas.setAttribute('role', 'img')
  app.canvas.setAttribute('aria-label', 'Naval arena with your ship and a blocking island')
  app.canvas.style.width = '100%'
  app.canvas.style.height = '100%'

  const waves = new Graphics()
  for (let y = 25; y < arena.height; y += 50) {
    for (let x = 20; x < arena.width; x += 90) waves.moveTo(x, y).lineTo(x + 24, y + 5)
  }
  waves.stroke({ color: 0x9ae0df, width: 2, alpha: 0.25 })
  app.stage.addChild(waves)
  const land = new Graphics()
    .circle(island.x, island.y, island.radius)
    .fill(0xe5c888)
    .circle(island.x, island.y, island.radius - 14)
    .fill(0x63994c)
    .circle(island.x - 24, island.y - 20, 18)
    .fill(0x43763f)
    .circle(island.x + 20, island.y + 30, 24)
    .fill(0x43763f)
  app.stage.addChild(land)
  const ship = new Sprite(texture)
  ship.anchor.set(0.5)
  ship.width = 44
  ship.height = 64
  app.stage.addChild(ship)
  const health = new Graphics()
  app.stage.addChild(health)
  const projectileSprites = new Map<number, Sprite>()
  const effectSprites = new Map<number, Sprite>()
  const enemySprites = new Map<number, Sprite>()

  function shipTint(ratio: number) {
    return ratio > 0.65 ? 0xffffff : ratio > 0.3 ? 0xc9a379 : 0x96745c
  }
  function healthBar(x: number, y: number, ratio: number) {
    const barY = Math.max(10, y - 52)
    health
      .rect(x - 24, barY, 48, 7)
      .fill(0x183236)
      .rect(x - 22, barY + 2, 44 * Math.max(0, ratio), 3)
      .fill(ratio > 0.3 ? 0x88df73 : 0xff977c)
  }

  function removeMissing(sprites: Map<number, Sprite>, ids: Set<number>) {
    for (const [id, sprite] of sprites)
      if (!ids.has(id)) {
        sprite.destroy({ texture: false, textureSource: false })
        sprites.delete(id)
      }
  }

  function draw(renderNow = true) {
    const { player, enemies, projectiles, effects, elapsedMs, config } = engine.getState()
    ship.position.set(player.x, player.y)
    // The provided hull points down; simulation heading zero points right.
    ship.rotation = player.heading - Math.PI / 2
    ship.tint = shipTint(player.hp / config.playerHp)
    ship.alpha = player.hp > 0 ? 1 : 0.3
    health.clear()
    healthBar(player.x, player.y, player.hp / config.playerHp)
    removeMissing(enemySprites, new Set(enemies.map(({ id }) => id)))
    for (const enemy of enemies) {
      let sprite = enemySprites.get(enemy.id)
      if (!sprite) {
        sprite = new Sprite(enemy.kind === 'chaser' ? chaserTexture : shooterTexture)
        sprite.anchor.set(0.5)
        sprite.width = 44
        sprite.height = 64
        app.stage.addChildAt(sprite, app.stage.getChildIndex(health))
        enemySprites.set(enemy.id, sprite)
      }
      sprite.position.set(enemy.x, enemy.y)
      sprite.rotation = enemy.heading - Math.PI / 2
      const ratio = enemy.hp / (enemy.kind === 'chaser' ? config.chaserHp : config.shooterHp)
      sprite.tint = shipTint(ratio)
      healthBar(enemy.x, enemy.y, ratio)
    }
    removeMissing(projectileSprites, new Set(projectiles.map(({ id }) => id)))
    for (const projectile of projectiles) {
      let sprite = projectileSprites.get(projectile.id)
      if (!sprite) {
        sprite = new Sprite(projectileTexture)
        sprite.anchor.set(0.5)
        sprite.width = sprite.height = 8
        app.stage.addChild(sprite)
        projectileSprites.set(projectile.id, sprite)
      }
      sprite.position.set(projectile.x, projectile.y)
    }
    removeMissing(effectSprites, new Set(effects.map(({ id }) => id)))
    for (const effect of effects) {
      let sprite = effectSprites.get(effect.id)
      if (!sprite) {
        sprite = new Sprite(effect.kind === 'fire' ? fireTexture : impactTexture)
        sprite.anchor.set(0.5)
        sprite.width = sprite.height =
          effect.kind === 'fire' ? 22 : effect.kind === 'destruction' ? 70 : 30
        app.stage.addChild(sprite)
        effectSprites.set(effect.id, sprite)
      }
      sprite.position.set(effect.x, effect.y)
      sprite.rotation = effect.heading
      sprite.alpha = Math.min(
        1,
        (effect.expiresAtMs - elapsedMs) /
          (effect.kind === 'fire' ? 120 : effect.kind === 'destruction' ? 400 : 180),
      )
    }
    if (renderNow) app.render()
  }
  const tick = () => {
    if (!manualClock) engine.frame()
    draw(false)
  }
  // PixiJS renders at LOW (-25); collect only after that render completes.
  const afterRender = () => onRender?.(performance.now())
  let destroyed = false
  return {
    start() {
      host.appendChild(app.canvas)
      engine.frame()
      draw()
      if (!manualClock) {
        app.ticker.add(tick)
        if (onRender) app.ticker.add(afterRender, undefined, -26)
        app.start()
      }
    },
    draw,
    destroy() {
      if (destroyed) return
      destroyed = true
      app.ticker.remove(tick)
      app.ticker.remove(afterRender)
      projectileSprites.clear()
      effectSprites.clear()
      enemySprites.clear()
      app.destroy(true, { children: true, texture: false, textureSource: false })
    },
  }
}
