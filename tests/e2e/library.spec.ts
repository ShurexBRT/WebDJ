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

test('starts playback from the library without waiting for background analysis', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Add tracks to library', { exact: true }).setInputFiles([
    testWavFile('Immediate DJ - Play Now.wav', 6, 220),
    testWavFile('Background DJ - Analyze Later.wav', 6, 330),
  ])

  await page.getByRole('button', { name: 'Load Play Now to deck A', exact: true }).click()
  await expect(page.getByLabel('Seek deck A', { exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Play deck A', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Pause deck A', exact: true })).toBeVisible({ timeout: 3_000 })
  await expect.poll(async () => Number(await page.getByLabel('Seek deck A', { exact: true }).inputValue())).toBeGreaterThan(0)
})

test('pre-analyzes imported tracks sequentially and caches the results', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Add tracks to library', { exact: true }).setInputFiles(tracks)

  const analysisStatus = page.getByLabel('Library analysis status', { exact: true })
  await expect(analysisStatus).toContainText('ANALYZED 2/2', { timeout: 15_000 })

  const cachedProfiles = await page.evaluate(async () => new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
    const request = indexedDB.open('webdj-studio', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const database = request.result
      const transaction = database.transaction('trackProfiles', 'readonly')
      const getAll = transaction.objectStore('trackProfiles').getAll()
      getAll.onerror = () => reject(getAll.error)
      getAll.onsuccess = () => resolve(getAll.result as Array<Record<string, unknown>>)
      transaction.oncomplete = () => database.close()
    }
  }))

  expect(cachedProfiles).toHaveLength(2)
  expect(cachedProfiles.every((profile) => Number(profile.durationSeconds) > 0)).toBe(true)
  expect(cachedProfiles.every((profile) => profile.gainAnalysisStatus === 'detected')).toBe(true)
  expect(cachedProfiles.every((profile) => Array.isArray(profile.waveform) && profile.waveform.length > 0)).toBe(true)
})

test('restores saved library rows after a page reload without copying audio into IndexedDB', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Add tracks to library', { exact: true }).setInputFiles(tracks)
  const library = page.getByRole('table', { name: 'Local music library', exact: true })
  await expect(library).toContainText('Blue Track')
  await expect(library).toContainText('Orange Track')

  await page.waitForTimeout(350)
  await page.reload()

  const restoredLibrary = page.getByRole('table', { name: 'Local music library', exact: true })
  await expect(restoredLibrary).toContainText('Blue Track')
  await expect(restoredLibrary).toContainText('Orange Track')
  await expect(page.getByRole('button', { name: 'Load Blue Track to deck A', exact: true })).toBeDisabled()
  await expect(page.getByTestId('deck-A')).toContainText('No track loaded')
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
