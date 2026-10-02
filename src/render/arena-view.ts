import { Application, Assets, Graphics, Sprite } from 'pixi.js'
import type { Texture } from 'pixi.js'
import { arena, island } from '../core/simulation'
import type { GameEngine } from '../engine/game-engine'

const shipUrl = `${import.meta.env.BASE_URL}assets/png/default/ships/ship_1.png`
const projectileUrl = `${import.meta.env.BASE_URL}assets/png/default/ship_parts/cannon_ball.png`
const fireUrl = `${import.meta.env.BASE_URL}assets/png/default/effects/fire_1.png`
const impactUrl = `${import.meta.env.BASE_URL}assets/png/default/effects/explosion_1.png`

export async function createArenaView(host: HTMLDivElement, engine: GameEngine, manualClock: boolean) {
  const [texture, projectileTexture, fireTexture, impactTexture] = await Promise.all(
    [shipUrl, projectileUrl, fireUrl, impactUrl].map((url) => Assets.load<Texture>(url)),
  )
  const app = new Application()
  try {
    await app.init({
      width: arena.width, height: arena.height, background: 0x238598,
      resolution: window.devicePixelRatio || 1, autoDensity: true, antialias: true,
      autoStart: false, sharedTicker: false,
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
    .circle(island.x, island.y, island.radius).fill(0xe5c888)
    .circle(island.x, island.y, island.radius - 14).fill(0x63994c)
    .circle(island.x - 24, island.y - 20, 18).fill(0x43763f)
    .circle(island.x + 20, island.y + 30, 24).fill(0x43763f)
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

  function removeMissing(sprites: Map<number, Sprite>, ids: Set<number>) {
    for (const [id, sprite] of sprites) if (!ids.has(id)) {
      sprite.destroy({ texture: false, textureSource: false })
      sprites.delete(id)
    }
  }

  function draw(renderNow = true) {
    const { player, projectiles, effects, elapsedMs } = engine.getState()
    ship.position.set(player.x, player.y)
    // The provided hull points down; simulation heading zero points right.
    ship.rotation = player.heading - Math.PI / 2
    health.clear().rect(player.x - 24, player.y - 52, 48, 7).fill(0x183236)
      .rect(player.x - 22, player.y - 50, 44, 3).fill(0x88df73)
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
        sprite.width = sprite.height = effect.kind === 'fire' ? 22 : 30
        app.stage.addChild(sprite)
        effectSprites.set(effect.id, sprite)
      }
      sprite.position.set(effect.x, effect.y)
      sprite.rotation = effect.heading
      sprite.alpha = Math.min(1, (effect.expiresAtMs - elapsedMs) / (effect.kind === 'fire' ? 120 : 180))
    }
    if (renderNow) app.render()
  }
  const tick = () => {
    if (!manualClock) engine.frame()
    draw(false)
  }
  let destroyed = false
  return {
    start() {
      host.appendChild(app.canvas)
      engine.frame()
      draw()
      if (!manualClock) {
        app.ticker.add(tick)
        app.start()
      }
    },
    draw,
    destroy() {
      if (destroyed) return
      destroyed = true
      app.ticker.remove(tick)
      projectileSprites.clear()
      effectSprites.clear()
      app.destroy(true, { children: true, texture: false, textureSource: false })
    },
  }
}
