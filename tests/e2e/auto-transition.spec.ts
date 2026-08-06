import { expect, test } from '@playwright/test'
import { testWavFile } from './fixtures/audio'

async function prepareTwoTrackSession(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.getByLabel('Add tracks to library').setInputFiles([
    testWavFile('Reference DJ - Main Track.wav', 10, 220),
    testWavFile('Candidate DJ - Next Track.wav', 10, 330),
  ])
  await page.getByRole('button', { name: 'Load Main Track to deck A', exact: true }).click()
  await expect(page.getByTestId('deck-A')).toContainText('Reference DJ - Main Track.wav')
  await page.getByLabel('BPM deck A', { exact: true }).fill('240')
  await page.getByRole('button', { name: 'Play deck A', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Pause deck A', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'AI Assistant', exact: true }).click()
  await expect(page.getByRole('region', { name: 'AI next track assistant' })).toContainText('Next Track')
  await page.getByRole('button', { name: 'Prepare auto transition Next Track to deck B', exact: true }).click()
  await expect(page.getByTestId('deck-B')).toContainText('Candidate DJ - Next Track.wav')
  await page.getByLabel('BPM deck B', { exact: true }).fill('240')
  const console = page.getByRole('region', { name: 'Auto Transition control' })
  await expect(console).toContainText('READY', { timeout: 15_000 })
  return console
}

test('executes a confirmed transition and hands master control to the target deck', async ({ page }) => {
  const console = await prepareTwoTrackSession(page)
  await page.getByRole('button', { name: 'Start Auto Transition', exact: true }).click()
  await expect(console).toContainText('RUNNING')
  await expect(page.getByRole('button', { name: 'Pause deck B', exact: true })).toBeVisible()

  await expect(console).toContainText('COMPLETED', { timeout: 7_000 })
  await expect(page.getByRole('button', { name: 'Play deck A', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pause deck B', exact: true })).toBeVisible()
  await expect(page.getByLabel('Make deck B master')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('slider', { name: 'Crossfader' })).toHaveValue('1')
})

test('takeover cancels automation and restores the manual mixer state', async ({ page }) => {
  const console = await prepareTwoTrackSession(page)
  const crossfader = page.getByRole('slider', { name: 'Crossfader' })
  await page.getByRole('button', { name: 'Start Auto Transition', exact: true }).click()
  await expect(console).toContainText('RUNNING')
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: 'Cancel Auto Transition', exact: true }).click()

  await expect(page.getByRole('region', { name: 'Auto Transition control' })).toHaveCount(0)
  await expect(crossfader).toHaveValue('0')
  await expect(page.getByRole('button', { name: 'Play deck B', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pause deck A', exact: true })).toBeVisible()
})
