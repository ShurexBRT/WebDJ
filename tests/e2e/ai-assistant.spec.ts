import { expect, test } from '@playwright/test'
import { testWavFile } from './fixtures/audio'

test('ranks library candidates and loads a suggestion to the free deck', async ({ page }) => {
  await page.goto('/')

  await page.getByLabel('Add tracks to library').setInputFiles([
    testWavFile('Reference DJ - Main Track.wav', 8, 220),
    testWavFile('Candidate DJ - Next Track.wav', 8, 330),
  ])

  await page.getByRole('button', { name: 'Load Main Track to deck A', exact: true }).click()
  await expect(page.getByTestId('deck-A')).toContainText('Reference DJ - Main Track.wav')
  await page.getByLabel('BPM deck A', { exact: true }).fill('124')

  await page.getByRole('button', { name: 'Load Next Track to deck B', exact: true }).click()
  await expect(page.getByTestId('deck-B')).toContainText('Candidate DJ - Next Track.wav')
  await page.getByLabel('BPM deck B', { exact: true }).fill('125')

  await page.getByRole('button', { name: 'AI Assistant', exact: true }).click()
  const panel = page.getByRole('region', { name: 'AI next track assistant' })
  await expect(panel).toBeVisible()
  await expect(panel).toContainText('REFERENCE · DECK A')
  await expect(panel).toContainText('Next Track')
  await expect(panel).toContainText('MATCH')

  const loadSuggestion = page.getByRole('button', { name: 'Load AI suggestion Next Track to deck B', exact: true })
  await expect(loadSuggestion).toBeEnabled()
  await loadSuggestion.click()
  await expect(page.getByTestId('deck-B')).toContainText('Candidate DJ - Next Track.wav')
})

test('explains why the assistant cannot score without a reference deck', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'AI Assistant', exact: true }).click()
  await expect(page.getByText('Load a reference track')).toBeVisible()
})
