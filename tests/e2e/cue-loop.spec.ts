import { expect, test } from '@playwright/test'

test('shows independent cue point and loop controls for both decks', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('region', { name: 'Cue and loop deck A' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Cue and loop deck B' })).toBeVisible()
  await expect(page.getByLabel('Set cue point deck A')).toBeDisabled()
  await expect(page.getByLabel('Return to cue point deck A')).toBeDisabled()
  await expect(page.getByLabel('Loop deck A')).toBeDisabled()
  await expect(page.getByLabel('4 beat loop deck A')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('4 beat loop deck B')).toHaveAttribute('aria-pressed', 'true')
})

test('changes loop size independently per deck', async ({ page }) => {
  await page.goto('/')

  await page.getByLabel('8 beat loop deck A').click()
  await page.getByLabel('2 beat loop deck B').click()

  await expect(page.getByLabel('8 beat loop deck A')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('4 beat loop deck A')).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByLabel('2 beat loop deck B')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('4 beat loop deck B')).toHaveAttribute('aria-pressed', 'false')
})
