import { expect, test } from '@playwright/test'
import { advance, startGame } from './game-fixture.js'

async function stored(page: import('@playwright/test').Page) {
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

test('recovers a real timeout after commit without adding another record', async ({ page }) => {
  await startGame(page, 'lethal-chaser', 'submit-timeout-after-commit')
  await advance(page, 100)
  await expect
    .poll(async () => {
      const data = await stored(page)
      return Boolean(data.result && data.database.records[data.result.record.matchId])
    })
    .toBe(true)
  const pending = await stored(page)
  expect(Object.keys(pending.outbox.entries)).toHaveLength(1)
  await expect(page.getByRole('status')).toHaveText('Registration confirmed.', { timeout: 15000 })
  const confirmed = await stored(page)
  expect(confirmed.database.records[pending.result.record.matchId]).toEqual(pending.result.record)
  expect(
    Object.values(confirmed.database.records).filter(
      (record: unknown) =>
        (record as { matchId: string }).matchId === pending.result.record.matchId,
    ),
  ).toHaveLength(1)
  expect(Object.keys(confirmed.outbox.entries)).toHaveLength(0)
})
test('recovers a committed response lost on refresh using the same identifier', async ({
  page,
}) => {
  await startGame(page, 'lethal-chaser', 'submit-timeout-after-commit')
  await advance(page, 100)
  await expect
    .poll(async () => {
      const data = await stored(page)
      return Boolean(data.result && data.database.records[data.result.record.matchId])
    })
    .toBe(true)
  const original = (await stored(page)).result.record
  await page.reload()
  await page.getByRole('button', { name: 'Last Result', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('Registration confirmed.')
  const data = await stored(page)
  expect(data.result.record).toEqual(original)
  expect(data.database.records[original.matchId]).toEqual(original)
  expect(Object.keys(data.outbox.entries)).toHaveLength(0)
})
for (const [scenario, attempts] of [
  ['http-4xx', 1],
  ['http-5xx', 3],
  ['connection-failure', 3],
  ['timeout', 3],
] as const) {
  test(`bounds ${scenario} attempts and recovers without changing its payload`, async ({
    page,
  }) => {
    test.setTimeout(scenario === 'timeout' ? 45000 : 30000)
    await startGame(page, 'lethal-chaser', scenario)
    await advance(page, 100)
    await expect(page.getByRole('status')).toHaveText('Registration pending. Please retry.', {
      timeout: 22000,
    })
    const failed = await stored(page)
    const original = failed.result.record
    expect(failed.outbox.entries[original.matchId].attempts).toBe(attempts)
    expect(failed.database.records[original.matchId]).toBeUndefined()
    await page.getByRole('button', { name: 'Main Menu', exact: true }).click()
    await page.getByText('Network scenarios', { exact: true }).click()
    await page.getByLabel('Scenario', { exact: true }).selectOption('success')
    await page.getByRole('button', { name: 'Apply', exact: true }).click()
    await expect.poll(async () => Object.keys((await stored(page)).outbox.entries).length).toBe(0)
    expect((await stored(page)).database.records[original.matchId]).toEqual(original)
  })
}
test('scenario selection preserves data and reset reseeds only owned demo state', async ({
  page,
}) => {
  await page.goto('/?scenario=success')
  await page.getByRole('tab', { name: 'Ranking', exact: true }).click()
  await expect(page.getByRole('tabpanel')).toContainText('12 matches')
  const options = await page.evaluate(() => localStorage.getItem('pirate-battle.options.v1'))
  await page.evaluate(() => localStorage.setItem('unrelated-key', 'keep'))
  await page.getByText('Network scenarios', { exact: true }).click()
  await page.getByLabel('Scenario', { exact: true }).selectOption('multi-page')
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect(page.getByRole('tabpanel')).toContainText('12 matches')
  await page.getByRole('button', { name: 'Reset demo data', exact: true }).click()
  await expect(page.getByRole('tabpanel')).toContainText('25 matches')
  expect(await page.evaluate(() => localStorage.getItem('pirate-battle.options.v1'))).toBe(options)
  expect(await page.evaluate(() => localStorage.getItem('unrelated-key'))).toBe('keep')
})
test('ignores a delayed pre-registration history read when returning to the tab', async ({
  page,
}) => {
  await page.goto('/?e2e=1&seed=42&fixture=lethal-chaser&scenario=empty')
  await page.getByRole('tab', { name: 'Match History', exact: true }).click()
  await expect(page.getByRole('tabpanel')).toContainText('No matches found.')
  await page.getByText('Network scenarios', { exact: true }).click()
  await page.getByLabel('Scenario', { exact: true }).selectOption('out-of-order')
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect(page.getByRole('tabpanel').getByRole('status')).toHaveText('Loading match history…')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect.poll(() => page.evaluate(() => Boolean(window.__game))).toBe(true)
  await advance(page, 100)
  await expect(page.getByRole('status')).toHaveText('Registration confirmed.')
  const original = (await stored(page)).result.record
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click()
  await expect(
    page.getByRole('tabpanel').locator(`[data-match-id="${original.matchId}"]`),
  ).toHaveCount(1)
  await page.clock.install()
  await page.clock.runFor(2500)
  await expect(
    page.getByRole('tabpanel').locator(`[data-match-id="${original.matchId}"]`),
  ).toHaveCount(1)
  await expect(page.getByRole('tabpanel').getByRole('alert')).toHaveCount(0)
})
test('reset prevents a delayed submission from repopulating cleared state', async ({ page }) => {
  await startGame(page, 'lethal-chaser', 'slow')
  await page.clock.install()
  await advance(page, 100)
  await expect(page.getByRole('status')).toHaveText('Registering match…')
  const original = (await stored(page)).result.record
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click()
  await page.getByText('Network scenarios', { exact: true }).click()
  await page.getByRole('button', { name: 'Reset demo data', exact: true }).click()
  await expect.poll(async () => Object.keys((await stored(page)).outbox.entries).length).toBe(0)
  await page.clock.runFor(3000)
  const reset = await stored(page)
  expect(reset.result.record).toBeNull()
  expect(reset.database.records[original.matchId]).toBeUndefined()
  expect(Object.keys(reset.outbox.entries)).toHaveLength(0)
})
test('shows a fallback for an unknown scenario without blocking lists', async ({ page }) => {
  await page.goto('/?scenario=unknown')
  await page.getByText('Network scenarios', { exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('Unknown network scenario. Using success.')
  await page.getByRole('tab', { name: 'Ranking', exact: true }).click()
  await expect(page.getByRole('tabpanel').locator('tbody tr')).toHaveCount(10)
})
