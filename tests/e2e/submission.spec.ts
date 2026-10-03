import { expect, test } from '@playwright/test'
import { advance, startGame } from './game-fixture.js'

export async function stored(page: import('@playwright/test').Page) {
  return page.evaluate(() => ({
    result: JSON.parse(localStorage.getItem('pirate-battle.last-result.v1') ?? 'null'),
    outbox: JSON.parse(localStorage.getItem('pirate-battle.outbox.v1') ?? '{"entries":{}}'),
    database: JSON.parse(localStorage.getItem('pirate-battle.msw-db.v1') ?? '{"records":{}}'),
  }))
}
test.beforeEach(({ page }) => {
  page.on('pageerror', (error) => {
    throw error
  })
})

test('registers a real completion once and exposes it in both tabs after refresh', async ({
  page,
}) => {
  await startGame(page, 'lethal-chaser', 'success')
  await advance(page, 100)
  await expect(page.getByRole('dialog').getByRole('status')).toHaveText('Registration confirmed.')
  const data = await stored(page)
  const record = data.result.record
  expect(Object.keys(data.outbox.entries)).toHaveLength(0)
  expect(data.database.records[record.matchId]).toEqual(record)
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click()
  await page.getByRole('tab', { name: 'Ranking', exact: true }).click()
  await page.getByLabel('Ranking configuration').selectOption('last')
  await expect(
    page.getByRole('tabpanel').locator(`[data-match-id="${record.matchId}"]`),
  ).toHaveCount(1)
  await page.getByRole('tab', { name: 'Match History', exact: true }).click()
  await expect(
    page.getByRole('tabpanel').locator(`[data-match-id="${record.matchId}"]`),
  ).toHaveCount(1)
  await page.reload()
  await page.getByRole('button', { name: 'Last Result', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('Registration confirmed.')
  expect((await stored(page)).result.record).toEqual(record)
})
test('recovers pending registration after refresh without blocking another match', async ({
  page,
}) => {
  await startGame(page, 'lethal-chaser', 'offline-at-match-end')
  await advance(page, 100)
  await expect(page.getByRole('dialog').getByRole('status')).toHaveText(
    'Registration pending. Please retry.',
  )
  const original = (await stored(page)).result.record
  await page.getByRole('button', { name: 'Play Again', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__game?.getState().status)).toBe('running')
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click()
  await page.reload()
  await page.getByText('Network scenarios', { exact: true }).click()
  await page.getByRole('button', { name: 'Recover connection', exact: true }).click()
  await expect.poll(async () => Object.keys((await stored(page)).outbox.entries).length).toBe(0)
  const recovered = await stored(page)
  expect(recovered.database.records[original.matchId]).toEqual(original)
  expect(recovered.result.record).toEqual(original)
  expect(recovered.result.submissionStatus).toBe('confirmed')
})
test('coalesces repeated retry clicks and removes only each confirmed match', async ({ page }) => {
  await startGame(page, 'lethal-chaser', 'http-4xx')
  await advance(page, 100)
  await expect(page.getByRole('status')).toHaveText('Registration pending. Please retry.')
  const first = (await stored(page)).result.record
  await page.getByRole('button', { name: 'Play Again', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__game?.getState().status)).toBe('running')
  await advance(page, 100)
  await expect(page.getByRole('status')).toHaveText('Registration pending. Please retry.')
  const second = (await stored(page)).result.record
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click()
  await page.getByText('Network scenarios', { exact: true }).click()
  await page.getByLabel('Scenario', { exact: true }).selectOption('slow')
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  const retry = page.getByRole('button', { name: 'Retry Registration', exact: true }).first()
  for (let index = 0; index < 3; index++) await retry.click()
  await expect.poll(async () => Object.keys((await stored(page)).outbox.entries).length).toBe(0)
  const data = await stored(page)
  expect(data.database.records[first.matchId]).toEqual(first)
  expect(data.database.records[second.matchId]).toEqual(second)
  expect(data.result.record.matchId).toBe(second.matchId)
})
test('registers into an empty demo and refreshes views shown before registration', async ({
  page,
}) => {
  await page.goto('/?e2e=1&seed=42&fixture=lethal-chaser&scenario=empty')
  await page.getByRole('tab', { name: 'Match History', exact: true }).click()
  await expect(page.getByRole('tabpanel')).toContainText('No matches found.')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect.poll(() => page.evaluate(() => Boolean(window.__game))).toBe(true)
  await advance(page, 100)
  await expect(page.getByRole('status')).toHaveText('Registration confirmed.')
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click()
  await expect(page.getByRole('tabpanel').locator('tbody tr')).toHaveCount(1)
  await page.getByRole('tab', { name: 'Ranking', exact: true }).click()
  await page.getByLabel('Ranking configuration').selectOption('last')
  await expect(page.getByRole('tabpanel').locator('tbody tr')).toHaveCount(1)
})
