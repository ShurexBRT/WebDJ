import { expect, test } from '@playwright/test'

test('shows independent beat grid controls for both decks', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('region', { name: 'Beat grid deck A' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Beat grid deck B' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nudge beat grid earlier deck A' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Reset beat grid deck A' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Nudge beat grid later deck B' })).toBeDisabled()
})
