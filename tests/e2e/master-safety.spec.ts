import { expect, test } from '@playwright/test'

test('syncs echo timing to each deck BPM and keeps free mode available', async ({ page }) => {
  await page.goto('/')

  await page.getByLabel('BPM deck A', { exact: true }).fill('120')
  await expect(page.getByLabel('Echo time deck A', { exact: true })).toHaveValue('250')
  await expect(page.getByLabel('Echo time deck A', { exact: true })).toBeDisabled()

  await page.getByLabel('Echo beat division deck A', { exact: true }).selectOption('2')
  await expect(page.getByLabel('Echo time deck A', { exact: true })).toHaveValue('1000')
  await expect(page.getByLabel('Echo time deck B', { exact: true })).toHaveValue('375')

  await page.getByLabel('Free echo deck A', { exact: true }).click()
  await expect(page.getByLabel('Echo time deck A', { exact: true })).toBeEnabled()
  await page.getByLabel('Echo time deck A', { exact: true }).fill('725')
  await expect(page.getByLabel('Echo time deck A', { exact: true })).toHaveValue('725')
})

test('shows limiter safety and conservative auto-gain controls', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByLabel('Master limiter status', { exact: true })).toContainText('LIMITER')
  await expect(page.getByLabel('Auto gain deck A', { exact: true })).toBeDisabled()
  await expect(page.getByLabel('Auto gain deck B', { exact: true })).toBeDisabled()
})
