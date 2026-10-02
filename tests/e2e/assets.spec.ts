import { expect, test } from '@playwright/test'

for (const asset of ['ships/ship_1.png', 'ships/ship_2.png', 'ships/ship_3.png', 'ship_parts/cannon_ball.png', 'effects/fire_1.png', 'effects/explosion_1.png']) {
test(`shows an asset error and retries after recovery: ${asset}`, async ({ page }) => {
  await page.route(`**/${asset}`, (route) => route.abort())
  await page.goto('/?e2e=1')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('The arena could not be loaded.')
  await expect(page.locator('canvas')).toHaveCount(0)
  await page.unroute(`**/${asset}`)
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(page.locator('canvas')).toHaveCount(1)
  await expect.poll(() => page.evaluate(() => Boolean(window.__game))).toBe(true)
})
}

test('allows exit while assets are still loading without attaching a stale canvas', async ({ page }) => {
  let releaseAsset!: () => void
  const heldAsset = new Promise<void>((resolve) => { releaseAsset = resolve })
  let finishAsset!: () => void
  const finishedAsset = new Promise<void>((resolve) => { finishAsset = resolve })
  await page.route('**/ships/ship_1.png', async (route) => {
    await heldAsset
    await route.continue()
    finishAsset()
  })
  await page.goto('/?e2e=1')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('Loading your ship…')
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click()
  releaseAsset()
  await finishedAsset
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: 'Pirate Battle' })).toBeVisible()
  await expect(page.locator('canvas')).toHaveCount(0)
  expect(await page.evaluate(() => window.__game)).toBeUndefined()
})
