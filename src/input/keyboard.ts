import type { GameEngine, GameAction } from '../engine/game-engine'

const bindings: Record<string, GameAction> = {
  KeyW: 'forward', ArrowUp: 'forward', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  Space: 'frontFire', KeyQ: 'leftFire', KeyE: 'rightFire',
}

export function attachKeyboard(engine: GameEngine) {
  function keydown(event: KeyboardEvent) {
    if (engine.getState().status === 'completed') return
    if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"]')) return
    if (event.code === 'Escape' || event.code === 'KeyP') {
      event.preventDefault()
      if (!event.repeat) {
        if (engine.getState().status === 'paused') engine.resume()
        else engine.pause()
      }
      return
    }
    const action = bindings[event.code]
    if (action && engine.getState().status === 'running') {
      event.preventDefault()
      if (!event.repeat) engine.press(`keyboard:${event.code}`, action)
    }
  }
  function keyup(event: KeyboardEvent) { engine.release(`keyboard:${event.code}`) }
  function blur() { engine.pause() }
  function visibility() { if (document.hidden) engine.pause() }
  window.addEventListener('keydown', keydown)
  window.addEventListener('keyup', keyup)
  window.addEventListener('blur', blur)
  document.addEventListener('visibilitychange', visibility)
  return () => {
    window.removeEventListener('keydown', keydown)
    window.removeEventListener('keyup', keyup)
    window.removeEventListener('blur', blur)
    document.removeEventListener('visibilitychange', visibility)
    engine.clearActions()
  }
}
