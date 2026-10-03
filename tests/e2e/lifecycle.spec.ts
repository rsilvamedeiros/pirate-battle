import { expect, test } from '@playwright/test'
import { advance, startGame, state } from './game-fixture.js'

test.setTimeout(60000)
test.beforeEach(({ page }) => {
  page.on('pageerror', (error) => {
    throw error
  })
})

test('cleans five session lifecycles without duplicate shots or abandoned records', async ({
  page,
}) => {
  await page.goto('/?e2e=1&seed=42&scenario=success')
  for (let cycle = 0; cycle < 5; cycle++) {
    await page.getByRole('button', { name: 'Play', exact: true }).click()
    await expect.poll(() => page.evaluate(() => Boolean(window.__game))).toBe(true)
    await expect(page.locator('canvas')).toHaveCount(1)
    expect((await state(page)).elapsedMs).toBe(0)
    await page.keyboard.down('Space')
    await advance(page, 100)
    await page.keyboard.up('Space')
    expect((await state(page)).projectiles).toHaveLength(1)
    await page.getByRole('button', { name: 'Pause', exact: true }).click()
    await page.getByRole('button', { name: 'Main Menu', exact: true }).click()
    await expect(page.locator('canvas')).toHaveCount(0)
    expect(await page.evaluate(() => Boolean(window.__game))).toBe(false)
    expect(
      await page.evaluate(() => [
        localStorage.getItem('pirate-battle.last-result.v1'),
        localStorage.getItem('pirate-battle.outbox.v1'),
      ]),
    ).toEqual([null, null])
  }
})

test('contains dialog focus and resumes or exits using keyboard controls', async ({ page }) => {
  await startGame(page)
  const pause = page.getByRole('button', { name: 'Pause', exact: true })
  await pause.focus()
  await page.keyboard.press('Enter')
  const resume = page.getByRole('button', { name: 'Resume', exact: true })
  const menu = page.getByRole('button', { name: 'Main Menu', exact: true })
  await expect(resume).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(menu).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(resume).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(menu).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(pause).toBeFocused()
  expect((await state(page)).status).toBe('running')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Options', exact: true })).toBeFocused()
})

test('keeps arena proportions, HUD and controls usable across orientation changes', async ({
  page,
}) => {
  await startGame(page)
  const initial = await state(page)
  for (const viewport of [
    { width: 412, height: 839 },
    { width: 839, height: 412 },
  ]) {
    await page.setViewportSize(viewport)
    await expect(page.locator('canvas')).toBeVisible()
    const layout = await page.evaluate(() => {
      const canvas = document.querySelector('canvas')!
      const bounds = canvas.getBoundingClientRect()
      const hud = document.querySelector('.game-hud')!.getBoundingClientRect()
      const controls = Array.from(document.querySelectorAll('.movement-controls button')).map(
        (button) => {
          const box = button.getBoundingClientRect()
          return { width: box.width, height: box.height, left: box.left, right: box.right }
        },
      )
      return {
        ratio: bounds.width / bounds.height,
        left: bounds.left,
        right: bounds.right,
        hudLeft: hud.left,
        hudRight: hud.right,
        overflow: document.documentElement.scrollWidth > innerWidth,
        controls,
      }
    })
    expect(layout.ratio).toBeCloseTo(10 / 7, 2)
    expect(layout.left).toBeGreaterThanOrEqual(0)
    expect(layout.right).toBeLessThanOrEqual(viewport.width)
    expect(layout.hudLeft).toBeGreaterThanOrEqual(0)
    expect(layout.hudRight).toBeLessThanOrEqual(viewport.width)
    expect(layout.overflow).toBe(false)
    for (const control of layout.controls) {
      expect(control.width).toBeGreaterThanOrEqual(44)
      expect(control.height).toBeGreaterThanOrEqual(44)
      expect(control.left).toBeGreaterThanOrEqual(0)
      expect(control.right).toBeLessThanOrEqual(viewport.width)
    }
    expect(await state(page)).toEqual(initial)
  }
})
