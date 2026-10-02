import { expect, test } from '@playwright/test'
import { advance, startGame, state } from './game-fixture.js'

test('starts a fresh rendered session and gates hooks behind e2e mode', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.locator('canvas')).toBeVisible()
  expect(await page.evaluate(() => window.__game)).toBeUndefined()
  await startGame(page)
  expect((await state(page)).player.hp).toBe(100)
  await expect(page.getByTestId('remaining-time')).toHaveText('Time: 120s')
})

test('moves and rotates through actual keyboard controls', async ({ page }) => {
  await startGame(page)
  await page.keyboard.down('w')
  await advance(page, 1000)
  await page.keyboard.up('w')
  expect((await state(page)).player.x).toBeCloseTo(330)
  await page.keyboard.down('a')
  await advance(page, 500)
  await page.keyboard.up('a')
  expect((await state(page)).player.heading).toBeCloseTo(-1.5)
  await page.keyboard.down('d')
  await advance(page, 500)
  await page.keyboard.up('d')
  expect((await state(page)).player.heading).toBeCloseTo(0)
})

test('blocks forward movement at the island and arena edge', async ({ page }) => {
  await startGame(page)
  await page.keyboard.down('w')
  await advance(page, 4000)
  await page.keyboard.up('w')
  expect((await state(page)).player.x).toBeLessThanOrEqual(360)
  await page.keyboard.down('a')
  await advance(page, Math.PI / 3 * 1000)
  await page.keyboard.up('a')
  await page.keyboard.down('w')
  await advance(page, 5000)
  await page.keyboard.up('w')
  expect((await state(page)).player.x).toBeGreaterThanOrEqual(40)
  expect((await state(page)).player.x).toBeCloseTo(40)
})

test('retains arena proportions and world coordinates after resize', async ({ page }) => {
  await startGame(page)
  const before = await state(page)
  await page.setViewportSize({ width: 839, height: 412 })
  const bounds = await page.locator('canvas').boundingBox()
  expect(bounds).not.toBeNull()
  expect(bounds!.width / bounds!.height).toBeCloseTo(10 / 7, 1)
  expect((await state(page)).player).toEqual(before.player)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('moves and rotates with simultaneous browser touch contacts', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium')
  await startGame(page)
  const forward = await page.getByRole('button', { name: 'Forward', exact: true }).boundingBox()
  const right = await page.getByRole('button', { name: 'Rotate Right', exact: true }).boundingBox()
  const protocol = await page.context().newCDPSession(page)
  await protocol.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [
    { id: 1, x: forward!.x + forward!.width / 2, y: forward!.y + forward!.height / 2 },
    { id: 2, x: right!.x + right!.width / 2, y: right!.y + right!.height / 2 },
  ] })
  await advance(page, 250)
  await protocol.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  const moved = await state(page)
  expect(moved.player.x).toBeGreaterThan(150)
  expect(moved.player.heading).toBeGreaterThan(0)
  await advance(page, 250)
  expect((await state(page)).player).toEqual(moved.player)
  await protocol.detach()
})
