import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import type { GameHooks } from '../../src/engine/test-hooks.js'

export async function startGame(page: Page) {
  await page.goto('/?e2e=1&seed=42')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByRole('img', { name: 'Naval arena with your ship and a blocking island' })).toBeVisible()
  await expect.poll(() => page.evaluate(() => Boolean(window.__game))).toBe(true)
}

export function advance(page: Page, milliseconds: number) {
  return page.evaluate((time) => window.__game!.advance(time), milliseconds)
}

export function state(page: Page): Promise<ReturnType<GameHooks['getState']>> {
  return page.evaluate(() => window.__game!.getState())
}
