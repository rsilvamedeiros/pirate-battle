export const arena = Object.freeze({ width: 1000, height: 700 })
export const island = Object.freeze({ x: 500, y: 350, radius: 100 })
export const playerRadius = 40
export const projectileRadius = 4

export interface Point {
  x: number
  y: number
}

/** First segment contact with a circle, including overlap at the origin. */
export function circleContact(
  from: Point,
  to: Point,
  center: Point,
  radius: number,
): number | null {
  const ox = from.x - center.x
  const oy = from.y - center.y
  const c = ox * ox + oy * oy - radius * radius
  if (c <= 0) return 0
  const dx = to.x - from.x
  const dy = to.y - from.y
  const a = dx * dx + dy * dy
  if (a === 0) return null
  const b = 2 * (ox * dx + oy * dy)
  const discriminant = b * b - 4 * a * c
  if (discriminant < 0) return null
  const contact = (-b - Math.sqrt(discriminant)) / (2 * a)
  return contact >= 0 && contact <= 1 ? contact : null
}

/** First exit from the arena inset by the projectile footprint. */
export function arenaContact(from: Point, to: Point): number | null {
  const min = projectileRadius
  const maxX = arena.width - min
  const maxY = arena.height - min
  if (from.x < min || from.x > maxX || from.y < min || from.y > maxY) return 0
  let contact = Infinity
  if (to.x < min) contact = Math.min(contact, (min - from.x) / (to.x - from.x))
  if (to.x > maxX) contact = Math.min(contact, (maxX - from.x) / (to.x - from.x))
  if (to.y < min) contact = Math.min(contact, (min - from.y) / (to.y - from.y))
  if (to.y > maxY) contact = Math.min(contact, (maxY - from.y) / (to.y - from.y))
  return Number.isFinite(contact) ? contact : null
}
