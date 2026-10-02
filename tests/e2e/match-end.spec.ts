import { expect, test } from '@playwright/test'
import { advance, startGame, state } from './game-fixture.js'

test('ends on real lethal damage and stops all gameplay', async ({ page }) => {
  await startGame(page, 'lethal-chaser')
  await page.keyboard.down('w')
  await page.keyboard.down('Space')
  await advance(page, 100)
  const completed = await state(page)
  expect(completed).toMatchObject({ status: 'completed', endReason: 'player-death', player: { hp: 0 }, score: 0 })
  await expect(page.getByText('Your ship was destroyed.', { exact: true })).toBeVisible()
  await advance(page, 30000)
  expect(await state(page)).toEqual(completed)
  await page.keyboard.up('w')
  await page.keyboard.up('Space')
})

test('restarts with fresh health, score, input, enemies and scheduling', async ({ page }) => {
  await startGame(page, 'lethal-chaser')
  const initial = await state(page)
  await advance(page, 100)
  await page.getByRole('button', { name: 'Play Again', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__game?.getState().status)).toBe('running')
  expect(await state(page)).toEqual(initial)
})

test('ends at configured active time while enemy rules remain enabled', async ({ page }) => {
  await startGame(page, 'time-expiry')
  await advance(page, 120000)
  const completed = await state(page)
  expect(completed.endReason).toBe('time-expired')
  expect(completed.elapsedMs).toBe(120000)
  expect(completed.spawnCount).toBeGreaterThan(0)
  expect(completed.player.hp).toBeGreaterThan(0)
  await expect(page.getByText('Time expired. Your voyage has ended.', { exact: true })).toBeVisible()
  await advance(page, 5000)
  expect(await state(page)).toEqual(completed)
})
