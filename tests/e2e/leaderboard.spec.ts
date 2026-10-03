import { expect, test } from '@playwright/test'

async function open(page: import('@playwright/test').Page, scenario = 'success') {
  await page.goto(`/?scenario=${scenario}&seed=42`)
  await page.getByRole('tab', { name: 'Ranking', exact: true }).click()
}
test.beforeEach(({ page }) => {
  page.on('pageerror', (error) => {
    throw error
  })
})

test('loads both tabs through the worker with fixtures and complete history fields', async ({
  page,
}) => {
  await open(page)
  const panel = page.getByRole('tabpanel')
  await expect(panel.locator('tbody tr')).toHaveCount(10)
  expect(await page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
  await expect(panel.getByText('Page 1 of 2 · 12 matches', { exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'Match History', exact: true }).click()
  await expect(panel.locator('tbody tr')).toHaveCount(3)
  await expect(panel.getByRole('columnheader', { name: 'Date', exact: true })).toBeVisible()
  await expect(panel.getByRole('columnheader', { name: 'End reason', exact: true })).toBeVisible()
})
test('paginates ranking and history independently and retains absolute ranks', async ({ page }) => {
  await open(page, 'multi-page')
  const panel = page.getByRole('tabpanel')
  await expect(panel.locator('tbody tr')).toHaveCount(10)
  await panel.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(panel.getByText('Page 2 of 3 · 25 matches', { exact: true })).toBeVisible()
  await expect(panel.locator('tbody tr').first().locator('td').first()).toHaveText('11')
  await panel.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(panel.locator('tbody tr')).toHaveCount(5)
  await page.getByRole('tab', { name: 'Match History', exact: true }).click()
  await expect(panel.getByText('Page 1 of 3 · 25 matches', { exact: true })).toBeVisible()
  await panel.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(panel.getByText('Page 2 of 3 · 25 matches', { exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'Ranking', exact: true }).click()
  await expect(panel.getByText('Page 3 of 3 · 25 matches', { exact: true })).toBeVisible()
})
test('distinguishes empty lists from loading and errors in both tabs', async ({ page }) => {
  await open(page, 'empty')
  await expect(
    page.getByRole('tabpanel').getByText('No matches found.', { exact: true }),
  ).toBeVisible()
  await page.getByRole('tab', { name: 'Match History', exact: true }).click()
  await expect(
    page.getByRole('tabpanel').getByText('No matches found.', { exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})
test('keeps loading and query failure from blocking Options or gameplay', async ({ page }) => {
  await open(page, 'slow')
  await expect(page.getByRole('tabpanel').getByRole('status')).toHaveText('Loading ranking…')
  await page.getByRole('button', { name: 'Options', exact: true }).click()
  await expect(page.getByLabel('Game session time')).toBeVisible()
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click()
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.locator('canvas')).toHaveCount(1)
})
for (const [scenario, failed, unaffected] of [
  ['ranking-failure', 'Ranking', 'Match History'],
  ['history-failure', 'Match History', 'Ranking'],
] as const) {
  test(`isolates ${scenario} and supports query retry`, async ({ page }) => {
    await open(page, scenario)
    await page.getByRole('tab', { name: failed, exact: true }).click()
    await expect(page.getByRole('tabpanel').getByRole('alert')).toContainText(
      'selected network scenario',
      { timeout: 10000 },
    )
    await page
      .getByRole('tabpanel')
      .getByRole('button', { name: 'Retry Records', exact: true })
      .click()
    await expect(page.getByRole('tabpanel').getByRole('status')).toBeVisible()
    await expect(page.getByRole('tabpanel').getByRole('alert')).toContainText(
      'selected network scenario',
      { timeout: 10000 },
    )
    await page.getByRole('tab', { name: unaffected, exact: true }).click()
    await expect(page.getByRole('tabpanel').locator('tbody tr')).not.toHaveCount(0)
    await expect(page.getByRole('tabpanel').getByRole('alert')).toHaveCount(0)
    await page.getByText('Network scenarios', { exact: true }).click()
    await page.getByLabel('Scenario', { exact: true }).selectOption('success')
    await page.getByRole('button', { name: 'Apply', exact: true }).click()
    await page.getByRole('tab', { name: failed, exact: true }).click()
    await expect(page.getByRole('tabpanel').locator('tbody tr')).not.toHaveCount(0)
    await expect(page.getByRole('tabpanel').getByRole('alert')).toHaveCount(0)
  })
}
test('filters ranking by current Options rather than comparing unequal configurations', async ({
  page,
}) => {
  await open(page)
  await expect(page.getByRole('tabpanel').locator('tbody tr')).toHaveCount(10)
  await page.getByRole('button', { name: 'Options', exact: true }).click()
  await page.getByLabel('Game session time').fill('60')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click()
  await expect(
    page.getByRole('tabpanel').getByText('No matches found.', { exact: true }),
  ).toBeVisible()
})
test('refetches a fresh cached tab and keeps keyboard tab navigation usable', async ({ page }) => {
  const reads: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/api/ranking?')) reads.push(request.url())
  })
  await open(page)
  await expect(page.getByRole('tabpanel').locator('tbody tr')).toHaveCount(10)
  const initialReads = reads.length
  await page.getByRole('tab', { name: 'Ranking', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'Match History', exact: true })).toBeFocused()
  await expect(page.getByRole('tabpanel').locator('tbody tr')).toHaveCount(3)
  await page.keyboard.press('ArrowLeft')
  await expect.poll(() => reads.length).toBeGreaterThan(initialReads)
  await expect(page.getByRole('tabpanel').locator('tbody tr')).toHaveCount(10)
})
