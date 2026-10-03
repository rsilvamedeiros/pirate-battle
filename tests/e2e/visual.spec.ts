import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { advance } from './game-fixture.js'

// Cold browser/worker startup plus two full-page captures can exceed 30 seconds.
test.setTimeout(60000)

// Freeze dates only: worker startup, HTTP timeouts and retries keep real timers.
test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => { throw error })
  await page.clock.setFixedTime(new Date('2026-10-03T12:00:00.000Z'))
})

async function ready(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(Array.from(document.images, (image) => image.decode()))
  })
}

const screenshot = { fullPage: true, animations: 'disabled', caret: 'hide', scale: 'css', maxDiffPixels: 0, timeout: 15000 } as const

test('matches the main menu baseline', async ({ page }) => {
  await page.goto('/?e2e=1&seed=42&scenario=success')
  await page.getByText('Controls', { exact: true }).click()
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled()
  await expect(page.getByRole('tab', { name: 'Match History', exact: true })).toBeVisible()
  await ready(page)
  await expect(page).toHaveScreenshot('menu.png', screenshot)
})

test('matches a stable arena after real weapon input', async ({ page }) => {
  await page.goto('/?e2e=1&seed=42&scenario=success')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect.poll(() => page.evaluate(() => Boolean(window.__game))).toBe(true)
  await advance(page, 3000)
  await page.keyboard.down('Space')
  await page.keyboard.down('q')
  await advance(page, 100)
  await page.keyboard.up('Space')
  await page.keyboard.up('q')
  const state = await page.evaluate(() => window.__game!.getState())
  expect(state.status).toBe('running')
  expect(state.enemies.length).toBeGreaterThan(0)
  expect(state.projectiles).toHaveLength(4)
  await expect(page.locator('canvas')).toHaveCount(1)
  await ready(page)
  await expect(page).toHaveScreenshot('arena.png', screenshot)
  expect(await page.evaluate(() => window.__game!.getState())).toEqual(state)
})

test('matches a completed and confirmed result baseline', async ({ page }) => {
  await page.goto('/?e2e=1&seed=42&fixture=lethal-chaser&scenario=success')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect.poll(() => page.evaluate(() => Boolean(window.__game))).toBe(true)
  await advance(page, 100)
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('status')).toHaveText('Registration confirmed.')
  expect(await page.evaluate(() => window.__game!.getState().endReason)).toBe('player-death')
  await expect(dialog.getByRole('button', { name: 'Play Again', exact: true })).toBeVisible()
  await ready(page)
  await expect(page).toHaveScreenshot('result.png', screenshot)
})
