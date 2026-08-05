import { expect, test } from '@playwright/test'

test('shows independent beat and downbeat grid controls for both decks', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('region', { name: 'Beat grid deck A' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Beat grid deck B' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nudge beat grid earlier deck A' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Reset beat grid deck A' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Nudge beat grid later deck B' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Move downbeat earlier deck A' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Reset downbeat deck B' })).toBeDisabled()
})

test('toggles global quantize mode from the studio header', async ({ page }) => {
  await page.goto('/')
  const quantize = page.getByRole('button', { name: 'Quantize', exact: true })

  await expect(quantize).toHaveAttribute('aria-pressed', 'true')
  await quantize.click()
  await expect(quantize).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByRole('region', { name: 'Hot cues deck A' })).toContainText('FREE')
  await quantize.click()
  await expect(page.getByRole('region', { name: 'Hot cues deck A' })).toContainText('QNTZ')
})
