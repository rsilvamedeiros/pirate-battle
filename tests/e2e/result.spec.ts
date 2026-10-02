import { expect, test } from '@playwright/test'
import { advance, startGame, state } from './game-fixture.js'

const resultKey = 'pirate-battle.last-result.v1'
const outboxKey = 'pirate-battle.outbox.v1'

async function saved(page: import('@playwright/test').Page) {
  return page.evaluate(({ resultKey, outboxKey }) => ({
    result: JSON.parse(localStorage.getItem(resultKey) ?? 'null'),
    outbox: JSON.parse(localStorage.getItem(outboxKey) ?? 'null'),
  }), { resultKey, outboxKey })
}

test.beforeEach(({ page }) => { page.on('pageerror', (error) => { throw error }) })

test('shows death result, preserves one payload and restores it after refresh', async ({ page }) => {
  await startGame(page, 'lethal-chaser', 'http-4xx')
  await advance(page, 100)
  await expect(page.getByRole('dialog')).toContainText('Registration pending. Please retry.')
  const terminal = await state(page)
  const before = await saved(page)
  expect(before.result.record).toMatchObject({ score: terminal.score, durationMs: Math.floor(terminal.elapsedMs), endReason: 'player-death' })
  expect(Object.keys(before.outbox.entries)).toEqual([before.result.record.matchId])
  await advance(page, 5000)
  expect(await saved(page)).toEqual(before)
  await page.reload()
  await expect(page.locator('canvas')).toHaveCount(0)
  await page.getByRole('button', { name: 'Last Result', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Last Result', exact: true })).toBeFocused()
  await expect(page.getByText('Ship destroyed', { exact: true })).toBeVisible()
  await expect(page.getByRole('status')).toContainText('Registration pending. Please retry.')
  expect((await saved(page)).result.record).toEqual(before.result.record)
})

test('persists time expiry and excludes paused time from its duration', async ({ page }) => {
  await startGame(page, 'time-expiry', 'http-4xx')
  await advance(page, 1000)
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await advance(page, 30000)
  await page.getByRole('button', { name: 'Resume', exact: true }).click()
  await advance(page, 119000)
  const data = await saved(page)
  expect(data.result.record).toMatchObject({ durationMs: 120000, endReason: 'time-expired' })
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click()
  await page.getByRole('button', { name: 'Last Result', exact: true }).click()
  await expect(page.getByText('120.0s', { exact: true })).toBeVisible()
  await expect(page.getByText('Time expired', { exact: true })).toBeVisible()
})

test('keeps consecutive pending records with distinct IDs while allowing new gameplay', async ({ page }) => {
  await startGame(page, 'lethal-chaser', 'http-4xx')
  await advance(page, 100)
  const first = (await saved(page)).result.record
  await page.getByRole('button', { name: 'Play Again', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__game?.getState().status)).toBe('running')
  await advance(page, 100)
  const second = (await saved(page)).result.record
  expect(second.matchId).not.toBe(first.matchId)
  const outbox = (await saved(page)).outbox.entries
  expect(outbox[first.matchId].record).toEqual(first)
  expect(outbox[second.matchId].record).toEqual(second)
  await page.reload()
  await page.getByRole('button', { name: 'Last Result', exact: true }).click()
  await page.getByRole('button', { name: 'Play Again', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__game?.getState().status)).toBe('running')
  expect(Object.keys((await saved(page)).outbox.entries)).toHaveLength(2)
})

test('preserves earned score and the full configuration when Options later change', async ({ page }) => {
  await startGame(page, 'front-target', 'http-4xx')
  await page.keyboard.down('Space')
  await advance(page, 900)
  await page.keyboard.up('Space')
  await advance(page, 120000)
  await expect(page.getByRole('dialog')).toContainText('Registration pending. Please retry.')
  const before = await saved(page)
  expect(before.result.record.score).toBeGreaterThanOrEqual(1)
  expect(Object.keys(before.result.record.config)).toHaveLength(31)
  expect(before.result.record.config.shooterAttackRange).toBe(100)
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click()
  await page.getByRole('button', { name: 'Options', exact: true }).click()
  await page.getByLabel('Game session time').fill('60')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page.reload()
  expect((await saved(page)).result.record).toEqual(before.result.record)
})

test('reports failed local writes and retries with the same match identity', async ({ page }) => {
  await startGame(page, 'lethal-chaser', 'slow')
  await page.evaluate(() => {
    const original = Storage.prototype.setItem
    Object.defineProperty(Storage.prototype, 'setItem', { configurable: true, value: function (this: Storage, key: string, value: string) {
      if (key === 'pirate-battle.outbox.v1') throw new Error('Quota exceeded')
      return original.call(this, key, value)
    } })
    Object.defineProperty(window, '__restoreStorage', { configurable: true, value: () => { Storage.prototype.setItem = original } })
  })
  await advance(page, 100)
  await expect(page.getByRole('alert')).toContainText('refresh recovery is not guaranteed')
  expect((await saved(page)).outbox).toBeNull()
  await page.evaluate(() => (window as unknown as { __restoreStorage(): void }).__restoreStorage())
  await page.getByRole('button', { name: 'Retry Save', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  const persisted = await saved(page)
  expect(Object.keys(persisted.outbox.entries)).toEqual([persisted.result.record.matchId])
  await page.reload()
  expect((await saved(page)).result.record).toEqual(persisted.result.record)
})

test('recovers the result after an interrupted write using the durable outbox', async ({ page }) => {
  await startGame(page, 'lethal-chaser', 'http-4xx')
  await page.evaluate(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key === 'pirate-battle.last-result.v1') throw new Error('Interrupted')
      return original.call(this, key, value)
    }
  })
  await advance(page, 100)
  const before = await saved(page)
  expect(before.result).toBeNull()
  const record = Object.values(before.outbox.entries)[0] as { record: { matchId: string } }
  await page.reload()
  await page.getByRole('button', { name: 'Last Result', exact: true }).click()
  await expect(page.getByText('Ship destroyed', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Play Again', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__game?.getState().status)).toBe('running')
  await advance(page, 100)
  expect((await saved(page)).outbox.entries[record.record.matchId].record).toEqual(record.record)
})

test('keeps result actions usable without horizontal overflow in both orientations', async ({ page, isMobile }) => {
  await startGame(page, 'lethal-chaser', 'http-4xx')
  await advance(page, 100)
  for (const viewport of isMobile ? [{ width: 412, height: 839 }, { width: 839, height: 412 }] : [{ width: 1280, height: 720 }]) {
    await page.setViewportSize(viewport)
    await expect(page.getByRole('button', { name: 'Main Menu', exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click()
  await page.getByRole('button', { name: 'Last Result', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Play Again', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
