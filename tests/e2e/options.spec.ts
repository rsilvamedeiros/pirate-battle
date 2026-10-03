import { expect, test } from '@playwright/test'

const storageKey = 'pirate-battle.options.v1'

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => {
    throw error
  })
  await page.goto('/')
})

test('opens options with saved defaults and returns to the menu', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Pirate Battle' })).toBeVisible()
  await page.getByRole('button', { name: 'Options', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Options', exact: true })).toBeFocused()
  await expect(page.getByLabel('Game session time')).toHaveValue('120')
  await expect(page.getByLabel('Enemy spawn time')).toHaveValue('3')
  await expect(page.getByRole('spinbutton')).toHaveCount(2)
  await page.getByRole('button', { name: 'Main Menu' }).click()
  await expect(page.getByRole('button', { name: 'Options', exact: true })).toBeFocused()
  await page.getByText('Controls', { exact: true }).click()
  await expect(page.getByRole('table')).toBeVisible()
  await expect(page.getByRole('row')).toHaveCount(8)
})

for (const [sessionTime, spawnTime] of [
  ['60', '1'],
  ['180', '10'],
  ['90.5', '2.5'],
]) {
  test(`saves valid options ${sessionTime}s / ${spawnTime}s across refresh`, async ({ page }) => {
    const before = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), storageKey)
    await page.getByRole('button', { name: 'Options', exact: true }).click()
    await page.getByLabel('Game session time').fill(sessionTime)
    await page.getByLabel('Enemy spawn time').fill(spawnTime)
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByRole('status')).toHaveText(
      'Options saved. Changes apply to your next match.',
    )
    await page.reload()
    await page.getByRole('button', { name: 'Options', exact: true }).click()
    await expect(page.getByLabel('Game session time')).toHaveValue(sessionTime)
    await expect(page.getByLabel('Enemy spawn time')).toHaveValue(spawnTime)
    const after = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), storageKey)
    expect(after.playerId).toBe(before.playerId)
    expect(after.playerName).toBe('Player')
    expect(after.version).toBe(1)
  })
}

test('rejects invalid and empty options without overwriting saved values', async ({ page }) => {
  const original = await page.evaluate((key) => localStorage.getItem(key), storageKey)
  await page.getByRole('button', { name: 'Options', exact: true }).click()
  for (const [session, spawn] of [
    ['59', '0'],
    ['181', '11'],
    ['', ''],
    ['120', '-1'],
  ]) {
    await page.getByLabel('Game session time').fill(session)
    await page.getByLabel('Enemy spawn time').fill(spawn)
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByRole('alert').first()).toBeVisible()
    expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe(original)
  }
  await expect(page.getByLabel('Enemy spawn time')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByLabel('Enemy spawn time')).toHaveAttribute(
    'aria-describedby',
    /enemySpawnInterval-error/,
  )
})

test('discards unsaved changes when returning to the menu', async ({ page }) => {
  await page.getByRole('button', { name: 'Options', exact: true }).click()
  await page.getByLabel('Game session time').fill('180')
  await page.getByRole('button', { name: 'Main Menu' }).click()
  await page.getByRole('button', { name: 'Options', exact: true }).click()
  await expect(page.getByLabel('Game session time')).toHaveValue('120')
})

test('supports keyboard navigation validation and focus restoration', async ({ page }) => {
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Options', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Game session time')).toBeFocused()
  await page.getByLabel('Game session time').fill('59')
  await page.getByRole('button', { name: 'Save', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Game session time')).toBeFocused()
  await page.getByLabel('Game session time').fill('150')
  await page.getByRole('button', { name: 'Save', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status')).toContainText('Options saved.')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Main Menu' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Options', exact: true })).toBeFocused()
})

for (const raw of [
  '{invalid',
  JSON.stringify({ version: 2 }),
  JSON.stringify({
    version: 1,
    playerId: 'local',
    playerName: 'Player',
    sessionTime: 999,
    enemySpawnInterval: 3,
  }),
]) {
  test(`recovers invalid persisted options: ${raw}`, async ({ page }) => {
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key: storageKey,
      value: raw,
    })
    await page.reload()
    await expect(page.getByRole('status')).toContainText(/Default settings/)
    await page.getByRole('button', { name: 'Options', exact: true }).click()
    await expect(page.getByLabel('Game session time')).toHaveValue('120')
    await expect(page.getByLabel('Enemy spawn time')).toHaveValue('3')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByRole('status')).toHaveText(
      'Options saved. Changes apply to your next match.',
    )
  })
}

test('reports storage write failure and allows a successful retry', async ({ page }) => {
  await page.getByRole('button', { name: 'Options', exact: true }).click()
  await page.getByLabel('Game session time').fill('150')
  const original = await page.evaluate((key) => localStorage.getItem(key), storageKey)
  await page.evaluate(() => {
    Object.defineProperty(Storage.prototype, 'setItem', {
      configurable: true,
      value: () => {
        throw new Error('Storage unavailable')
      },
    })
  })
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Options could not be saved.')
  expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe(original)
  await page.reload()
  await page.getByRole('button', { name: 'Options', exact: true }).click()
  await expect(page.getByLabel('Game session time')).toHaveValue('120')
  await page.getByLabel('Game session time').fill('150')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Options saved.')
})

test('remains usable when browser storage cannot be read or written', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => {
        throw new Error('Storage blocked')
      },
    })
  })
  await page.reload()
  await expect(page.getByRole('status')).toContainText('Browser storage is unavailable.')
  await page.getByRole('button', { name: 'Options', exact: true }).click()
  await expect(page.getByLabel('Game session time')).toHaveValue('120')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Options could not be saved.')
})

test('keeps menu and options within the viewport', async ({ page, isMobile }) => {
  await expect(page.locator('.game-title img')).toBeVisible()
  expect(
    await page
      .locator('.game-title img')
      .evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
  ).toBe(true)
  if (isMobile) await page.getByRole('button', { name: 'Options', exact: true }).tap()
  else await page.getByRole('button', { name: 'Options', exact: true }).click()
  for (const viewport of isMobile
    ? [
        { width: 412, height: 839 },
        { width: 839, height: 412 },
      ]
    : [{ width: 1280, height: 720 }]) {
    await page.setViewportSize(viewport)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible()
  }
})
