import { expect, test } from '@playwright/test'
import type {} from '../../src/engine/profiling'

test.setTimeout(60000)

test('observes real rendered frames without exposing game mutation hooks and cleans up on exit', async ({ page }) => {
  page.on('pageerror', error => { throw error })
  // Behavior regression only: control browser RAF to avoid an unbounded
  // SwiftShader loop. The reference benchmark uses headed Chromium/real time.
  const time = new Date('2026-10-03T12:00:00.000Z')
  await page.clock.install({ time })
  await page.clock.pauseAt(time)
  await page.goto('/?profile=1&preset=endurance&seed=42&scenario=success')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect.poll(() => page.evaluate(() => Boolean(window.__profiling))).toBe(true)
  await page.clock.runFor(100)
  expect(await page.evaluate(() => window.__profiling!.status().frames)).toBeGreaterThan(2)
  expect(await page.evaluate(() => Boolean(window.__game))).toBe(false)
  expect(await page.evaluate(() => window.__profiling!.export().config)).toMatchObject({ playerHp: 500,
    sessionTime: 180, enemySpawnInterval: 3, chaserCollisionDamage: 1, shooterProjectileDamage: 1 })
  await page.keyboard.down('Space')
  await page.clock.runFor(100)
  expect(await page.evaluate(() => window.__profiling!.status().entities.projectiles)).toBeGreaterThan(0)
  await page.keyboard.up('Space')
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  const paused = await page.evaluate(() => window.__profiling!.status().activeMs)
  await page.clock.runFor(100)
  expect(await page.evaluate(() => window.__profiling!.status().pausedFrames)).toBeGreaterThan(2)
  expect(await page.evaluate(() => window.__profiling!.status().activeMs)).toBe(paused)
  await page.getByRole('button', { name: 'Resume', exact: true }).click()
  await page.clock.runFor(100)
  expect(await page.evaluate(() => window.__profiling!.status().activeMs)).toBeGreaterThan(paused)
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click()
  expect(await page.evaluate(() => [Boolean(window.__game), Boolean(window.__profiling)])).toEqual([false, false])
  await expect(page.locator('canvas')).toHaveCount(0)
})

test('keeps profiling and its balancing preset disabled in manual E2E mode', async ({ page }) => {
  await page.goto('/?e2e=1&profile=1&preset=endurance&seed=42&scenario=success')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect.poll(() => page.evaluate(() => Boolean(window.__game))).toBe(true)
  expect(await page.evaluate(() => Boolean(window.__profiling))).toBe(false)
  expect(await page.evaluate(() => window.__game!.getState().config)).toMatchObject({ playerHp: 100,
    sessionTime: 120, chaserCollisionDamage: 25, shooterProjectileDamage: 10 })
})
