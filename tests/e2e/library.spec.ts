import { expect, test } from '@playwright/test'
import { testWavFile } from './fixtures/audio'

const tracks = [
  testWavFile('Artist One - Blue Track.wav', 1, 440),
  testWavFile('Artist Two - Orange Track.wav', 1, 660),
]

test('imports, searches and loads local library tracks into either deck', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Add tracks to library', { exact: true }).setInputFiles(tracks)

  const library = page.getByRole('table', { name: 'Local music library', exact: true })
  await expect(library).toContainText('Blue Track')
  await expect(library).toContainText('Artist One')
  await expect(library).toContainText('Orange Track')

  await page.getByLabel('Search music library', { exact: true }).fill('orange')
  await expect(library).not.toContainText('Blue Track')
  await expect(library).toContainText('Orange Track')

  await page.getByRole('button', { name: 'Load Orange Track to deck B', exact: true }).click()
  await expect(page.getByTestId('deck-B')).toContainText('Artist Two - Orange Track.wav')
  await expect(page.getByTestId('deck-A')).toContainText('No track loaded')
  await expect(page.getByLabel('Seek deck B', { exact: true })).toBeEnabled()
})

test('removes tracks from the in-memory library', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Add tracks to library', { exact: true }).setInputFiles(tracks[0])
  await expect(page.getByRole('table', { name: 'Local music library', exact: true })).toContainText('Blue Track')
  await page.getByRole('button', { name: 'Remove Blue Track from library', exact: true }).click()
  await expect(page.getByRole('table', { name: 'Local music library', exact: true })).not.toContainText('Blue Track')
})

test('requires a second explicit click before clearing the whole library', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Add tracks to library', { exact: true }).setInputFiles(tracks)

  const library = page.getByRole('table', { name: 'Local music library', exact: true })
  await expect(library).toContainText('Blue Track')
  await expect(library).toContainText('Orange Track')

  await page.getByRole('button', { name: 'Clear library', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Confirm clear library', exact: true })).toBeVisible()
  await expect(library).toContainText('Blue Track')

  await page.getByRole('button', { name: 'Confirm clear library', exact: true }).click()
  await expect(library).not.toContainText('Blue Track')
  await expect(library).not.toContainText('Orange Track')
})
