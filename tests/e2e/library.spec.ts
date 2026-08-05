import { expect, test } from '@playwright/test'

const tracks = [
  { name: 'Artist One - Blue Track.mp3', mimeType: 'audio/mpeg', buffer: Buffer.from('blue audio') },
  { name: 'Artist Two - Orange Track.wav', mimeType: 'audio/wav', buffer: Buffer.from('orange audio') },
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
})

test('removes tracks from the in-memory library', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Add tracks to library', { exact: true }).setInputFiles(tracks[0])
  await expect(page.getByRole('table', { name: 'Local music library', exact: true })).toContainText('Blue Track')
  await page.getByRole('button', { name: 'Remove Blue Track from library', exact: true }).click()
  await expect(page.getByRole('table', { name: 'Local music library', exact: true })).not.toContainText('Blue Track')
})
