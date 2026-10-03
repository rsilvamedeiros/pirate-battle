import { describe, expect, it } from 'vitest'
import { arenaContact, circleContact } from './geometry'

describe('swept projectile contacts', () => {
  it('detects a circle crossed between non-overlapping endpoints', () => {
    expect(circleContact({ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 10, y: 0 }, 2)).toBeCloseTo(0.4)
  })
  it('detects tangent contact', () => {
    expect(circleContact({ x: 0, y: 2 }, { x: 20, y: 2 }, { x: 10, y: 0 }, 2)).toBeCloseTo(0.5)
  })
  it('returns immediate contact for an overlapping origin', () => {
    expect(circleContact({ x: 10, y: 0 }, { x: 20, y: 0 }, { x: 10, y: 0 }, 2)).toBe(0)
  })
  it('ignores a circle outside the segment and handles zero movement', () => {
    expect(circleContact({ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 }, 2)).toBeNull()
    expect(circleContact({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 }, 2)).toBeNull()
  })
  it.each([
    [
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ],
    [
      { x: 990, y: 10 },
      { x: 1000, y: 10 },
    ],
    [
      { x: 10, y: 10 },
      { x: 10, y: 0 },
    ],
    [
      { x: 10, y: 690 },
      { x: 10, y: 700 },
    ],
  ])('detects each arena edge including the projectile footprint', (from, to) => {
    expect(arenaContact(from, to)).toBeCloseTo(0.6)
  })
  it('removes an outside origin and accepts an internal segment', () => {
    expect(arenaContact({ x: 0, y: 20 }, { x: 20, y: 20 })).toBe(0)
    expect(arenaContact({ x: 20, y: 20 }, { x: 30, y: 30 })).toBeNull()
  })
})
