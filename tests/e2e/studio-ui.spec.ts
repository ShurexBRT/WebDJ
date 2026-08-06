import { expect, test } from '@playwright/test'

test('renders the full WebDJ studio layout', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText('WEB DJ')).toBeVisible()
  await expect(page.getByTestId('deck-A')).toBeVisible()
  await expect(page.getByTestId('deck-B')).toBeVisible()
  await expect(page.locator('#central-mixer')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Studio library and routing', exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Cue mix headphones', exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Audio output settings', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sampler', exact: true })).toHaveCount(0)
})

test('keeps mixer deck library and recorder controls accessible after the visual redesign', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('slider', { name: 'Trim deck A', exact: true })).toHaveValue('0')
  await expect(page.getByRole('slider', { name: 'high EQ deck B', exact: true })).toHaveValue('0')
  await expect(page.getByRole('slider', { name: 'Master volume', exact: true })).toBeVisible()
  await expect(page.getByRole('slider', { name: 'Crossfader', exact: true })).toHaveValue('0')
  await expect(page.getByRole('textbox', { name: 'Search music library', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Hot cue A deck A', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Start mix recording', exact: true })).toBeVisible()
})

test('captures the desktop studio for render comparison', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1536, height: 1024 })
  await page.goto('/')
  await page.locator('main').screenshot({ path: testInfo.outputPath('webdj-studio.png'), animations: 'disabled' })
  await testInfo.attach('webdj-studio', { path: testInfo.outputPath('webdj-studio.png'), contentType: 'image/png' })
})
