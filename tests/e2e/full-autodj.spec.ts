import { expect, test } from '@playwright/test'
import { testWavFile } from './fixtures/audio'

async function createAutoDjSession(page: import('@playwright/test').Page) {
  await page.goto('/')
  const panel = page.getByRole('region', { name: 'Full AutoDJ control' })
  await expect(page.getByRole('button', { name: 'Enable Full AutoDJ' })).toBeDisabled()

  await page.getByLabel('Add tracks to library').setInputFiles([
    testWavFile('Reference DJ - Main Track.wav', 10, 220),
    testWavFile('Candidate DJ - Next Track.wav', 10, 330),
  ])
  await page.getByRole('button', { name: 'Load Main Track to deck A', exact: true }).click()
  await expect(page.getByTestId('deck-A')).toContainText('Reference DJ - Main Track.wav')
  await page.getByLabel('BPM deck A', { exact: true }).fill('240')
  await page.getByRole('button', { name: 'Play deck A', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Enable Full AutoDJ' })).toBeEnabled()
  return panel
}

test('selects, prepares and continuously executes the next mix', async ({ page }) => {
  const panel = await createAutoDjSession(page)
  await page.getByRole('button', { name: 'Enable Full AutoDJ' }).click()
  await expect(panel).toContainText('Next Track', { timeout: 10_000 })
  await expect(page.getByTestId('deck-B')).toContainText('Candidate DJ - Next Track.wav', { timeout: 10_000 })
  await page.getByLabel('BPM deck B', { exact: true }).fill('240')
  await expect(panel).toContainText('READY', { timeout: 15_000 })

  await page.getByLabel('Seek deck A', { exact: true }).fill('7')
  await expect(panel).toContainText('MIXING', { timeout: 5_000 })
  await expect(panel).toContainText('1', { timeout: 8_000 })
  await expect(page.getByRole('button', { name: 'Play deck A', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pause deck B', exact: true })).toBeVisible()
  await expect(page.getByLabel('Make deck B master')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Take over from Full AutoDJ' })).toBeVisible()
})

test('takeover stops future automation without pausing the current manual deck', async ({ page }) => {
  const panel = await createAutoDjSession(page)
  await page.getByRole('button', { name: 'Enable Full AutoDJ' }).click()
  await expect(panel).toContainText('Next Track', { timeout: 10_000 })
  await page.getByRole('button', { name: 'Take over from Full AutoDJ' }).click()

  await expect(panel).toContainText('OFF')
  await expect(page.getByRole('button', { name: 'Enable Full AutoDJ' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pause deck A', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Play deck B', exact: true })).toBeVisible()
})
