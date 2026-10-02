import { expect, test } from '@playwright/test'
import { advance, startGame } from './game-fixture.js'

test('abandons an active match on refresh without persisting or submitting it', async ({ page }) => {
  await startGame(page)
  await advance(page, 1000)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Last Result', exact: true })).toHaveCount(0)
  expect(await page.evaluate(() => [localStorage.getItem('pirate-battle.last-result.v1'), localStorage.getItem('pirate-battle.outbox.v1')])).toEqual([null, null])
})

test('abandonment keeps the earlier completed result and pending queue unchanged', async ({ page }) => {
  await startGame(page, 'lethal-chaser')
  await advance(page, 100)
  const previous = await page.evaluate(() => [localStorage.getItem('pirate-battle.last-result.v1'), localStorage.getItem('pirate-battle.outbox.v1')])
  await page.getByRole('button', { name: 'Play Again', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__game?.getState().status)).toBe('running')
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click()
  expect(await page.evaluate(() => [localStorage.getItem('pirate-battle.last-result.v1'), localStorage.getItem('pirate-battle.outbox.v1')])).toEqual(previous)
  await expect(page.locator('canvas')).toHaveCount(0)
  expect(await page.evaluate(() => window.__game)).toBeUndefined()
})

test('repeated navigation cleans canvases and hooks without creating abandoned records', async ({ page }) => {
  await page.goto('/?e2e=1&seed=42')
  for (let cycle = 0; cycle < 3; cycle++) {
    await page.getByRole('button', { name: 'Play', exact: true }).click()
    await expect.poll(() => page.evaluate(() => Boolean(window.__game))).toBe(true)
    await expect(page.locator('canvas')).toHaveCount(1)
    await advance(page, 100)
    await page.getByRole('button', { name: 'Pause', exact: true }).click()
    await page.getByRole('button', { name: 'Main Menu', exact: true }).click()
    await expect(page.locator('canvas')).toHaveCount(0)
    expect(await page.evaluate(() => window.__game)).toBeUndefined()
  }
  expect(await page.evaluate(() => localStorage.getItem('pirate-battle.outbox.v1'))).toBeNull()
})
