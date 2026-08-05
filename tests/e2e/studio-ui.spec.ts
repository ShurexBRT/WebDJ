import { expect, test } from '@playwright/test'

test('renders the full WebDJ studio layout', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText('WEB DJ')).toBeVisible()
  await expect(page.getByTestId('deck-A')).toBeVisible()
  await expect(page.getByTestId('deck-B')).toBeVisible()
  await expect(page.locator('#central-mixer')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Studio library and routing' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Sampler panel' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Cue mix headphones' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Audio output settings' })).toBeVisible()
})

test('keeps mixer and deck controls accessible after the visual redesign', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('slider', { name: 'Trim deck A' })).toHaveValue('0')
  await expect(page.getByRole('slider', { name: 'high EQ deck B' })).toHaveValue('0')
  await expect(page.getByRole('slider', { name: 'Master volume' })).toBeVisible()
  await expect(page.getByRole('slider', { name: 'Crossfader' })).toHaveValue('0')
  await expect(page.getByRole('textbox', { name: 'Search loaded tracks' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Hot cue A deck A' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Kick' })).toBeVisible()
})
