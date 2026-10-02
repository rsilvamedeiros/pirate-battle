import { Application, Assets, Graphics, Sprite } from 'pixi.js'
import type { Texture } from 'pixi.js'
import { arena, island } from '../core/simulation'
import type { GameEngine } from '../engine/game-engine'

const shipUrl = `${import.meta.env.BASE_URL}assets/png/default/ships/ship_1.png`

export async function createArenaView(host: HTMLDivElement, engine: GameEngine, manualClock: boolean) {
  const texture = await Assets.load<Texture>(shipUrl)
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

  function draw(renderNow = true) {
    const { player } = engine.getState()
    ship.position.set(player.x, player.y)
    // The provided hull points down; simulation heading zero points right.
    ship.rotation = player.heading - Math.PI / 2
    health.clear().rect(player.x - 24, player.y - 52, 48, 7).fill(0x183236)
      .rect(player.x - 22, player.y - 50, 44, 3).fill(0x88df73)
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
      app.destroy(true, { children: true, texture: false, textureSource: false })
    },
  }
}
