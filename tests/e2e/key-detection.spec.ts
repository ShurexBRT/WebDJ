import { expect, test } from '@playwright/test'

test('shows independent key controls and Camelot compatibility', async ({ page }) => {
  await page.goto('/')

  const keyA = page.getByLabel('Key deck A')
  const keyB = page.getByLabel('Key deck B')
  await expect(keyA).toBeVisible()
  await expect(keyB).toBeVisible()

  await keyA.selectOption({ label: 'Am · 8A' })
  await keyB.selectOption({ label: 'C · 8B' })

  await expect(page.getByRole('region', { name: 'Musical key deck A' })).toContainText('A minor')
  await expect(page.getByRole('region', { name: 'Musical key deck A' })).toContainText('8A')
  await expect(page.getByRole('region', { name: 'Musical key deck A' })).toContainText('RELATIVE')
  await expect(page.getByRole('region', { name: 'Musical key deck B' })).toContainText('RELATIVE')
})

test('flags distant manual keys as a clash without coupling deck state', async ({ page }) => {
  await page.goto('/')

  await page.getByLabel('Key deck A').selectOption({ label: 'Am · 8A' })
  await page.getByLabel('Key deck B').selectOption({ label: 'E♭m · 2A' })

  await expect(page.getByRole('region', { name: 'Musical key deck A' })).toContainText('KEY CLASH')
  await expect(page.getByRole('region', { name: 'Musical key deck B' })).toContainText('E♭ minor')
  await expect(page.getByLabel('Key deck A')).toHaveValue('A minor')
})
