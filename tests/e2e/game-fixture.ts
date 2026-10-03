import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import type { GameHooks } from '../../src/engine/test-hooks.js'
import type { CombatFixture } from '../../src/engine/scenarios'
import type { ScenarioId } from '../../src/mocks/scenarios'

export async function startGame(page: Page, fixture?: CombatFixture, scenario?: ScenarioId) {
  await page.goto(`/?e2e=1&seed=42${fixture ? `&fixture=${fixture}` : ''}${scenario ? `&scenario=${scenario}` : ''}`)
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  // Cold SwiftShader initialization can exceed the default 5 s assertion limit.
  // Hooks are installed only after assets, rendering and input are initialized.
  await expect.poll(() => page.evaluate(() => Boolean(window.__game)), { timeout: 15000 }).toBe(true)
  await expect(page.getByRole('img', { name: 'Naval arena with your ship and a blocking island' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeEnabled()
}

export function advance(page: Page, milliseconds: number) {
  return page.evaluate((time) => window.__game!.advance(time), milliseconds)
}

export function state(page: Page): Promise<ReturnType<GameHooks['getState']>> {
  return page.evaluate(() => window.__game!.getState())
}
