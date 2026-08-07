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

async function forcePreparedDeckBpm(page: import('@playwright/test').Page, panel: import('@playwright/test').Locator) {
  await expect(async () => {
    await page.getByLabel('BPM deck A', { exact: true }).fill('240')
    await page.getByLabel('BPM deck B', { exact: true }).fill('240')
    await expect(panel).toContainText('READY', { timeout: 1_000 })
  }).toPass({ timeout: 15_000, intervals: [250, 500, 1_000] })
}

async function getReferenceDeck(page: import('@playwright/test').Page): Promise<'A' | 'B'> {
  const deckAMaster = await page.getByLabel('Make deck A master').getAttribute('aria-pressed')
  if (deckAMaster === 'true') return 'A'

  const deckBMaster = await page.getByLabel('Make deck B master').getAttribute('aria-pressed')
  if (deckBMaster === 'true') return 'B'

  if (await page.getByRole('button', { name: 'Pause deck A', exact: true }).isVisible()) return 'A'
  if (await page.getByRole('button', { name: 'Pause deck B', exact: true }).isVisible()) return 'B'

  throw new Error('Expected a MASTER or currently playing reference deck')
}

test('selects a mix style before automation and locks it while active', async ({ page }) => {
  await createAutoDjSession(page)
  const style = page.getByLabel('AutoDJ mix style')
  await expect(style).toHaveValue('smooth')
  await style.selectOption('deep')
  await expect(style).toHaveValue('deep')
  await page.getByRole('button', { name: 'Enable Full AutoDJ' }).click()
  await expect(style).toBeDisabled()
  await page.getByRole('button', { name: 'Take over from Full AutoDJ' }).click()
  await expect(style).toBeEnabled()
  await expect(style).toHaveValue('deep')
})

test('selects, prepares and continuously executes the next mix', async ({ page }) => {
  const panel = await createAutoDjSession(page)
  await page.getByRole('button', { name: 'Enable Full AutoDJ' }).click()
  await expect(panel).toContainText('NEXT TRACK', { timeout: 10_000 })
  await expect(page.getByTestId('deck-B')).toContainText('Candidate DJ - Next Track.wav', { timeout: 10_000 })
  await page.getByLabel('BPM deck B', { exact: true }).fill('240')
  await expect(panel).toContainText('READY', { timeout: 15_000 })

  await page.getByLabel('Seek deck A', { exact: true }).fill('7')
  await expect(panel).toContainText('MIXING', { timeout: 5_000 })
  await expect(page.getByLabel('Completed AutoDJ mixes')).toContainText('1', { timeout: 8_000 })
  await expect(page.getByRole('button', { name: 'Play deck A', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pause deck B', exact: true })).toBeVisible()
  await expect(page.getByLabel('Make deck B master')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Take over from Full AutoDJ' })).toBeVisible()
})

test('takeover stops future automation without pausing the current manual deck', async ({ page }) => {
  const panel = await createAutoDjSession(page)
  await page.getByRole('button', { name: 'Enable Full AutoDJ' }).click()
  await expect(panel).toContainText('NEXT TRACK', { timeout: 10_000 })
  await page.getByRole('button', { name: 'Take over from Full AutoDJ' }).click()

  await expect(panel).toContainText('OFF')
  await expect(page.getByRole('button', { name: 'Enable Full AutoDJ' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pause deck A', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Play deck B', exact: true })).toBeVisible()
})

test('survives five consecutive accelerated Full AutoDJ cycles', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/')
  const panel = page.getByRole('region', { name: 'Full AutoDJ control' })

  await page.getByLabel('Add tracks to library').setInputFiles([
    testWavFile('Soak DJ - Track 01.wav', 10, 220),
    testWavFile('Soak DJ - Track 02.wav', 10, 247),
    testWavFile('Soak DJ - Track 03.wav', 10, 277),
    testWavFile('Soak DJ - Track 04.wav', 10, 311),
    testWavFile('Soak DJ - Track 05.wav', 10, 349),
    testWavFile('Soak DJ - Track 06.wav', 10, 392),
    testWavFile('Soak DJ - Track 07.wav', 10, 440),
    testWavFile('Soak DJ - Track 08.wav', 10, 494),
  ])

  await page.getByRole('button', { name: 'Load Track 01 to deck A', exact: true }).click()
  await expect(page.getByTestId('deck-A')).toContainText('Soak DJ - Track 01.wav')
  await page.getByLabel('BPM deck A', { exact: true }).fill('240')
  await page.getByRole('button', { name: 'Play deck A', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Enable Full AutoDJ' })).toBeEnabled()
  await page.getByLabel('AutoDJ mix style').selectOption('quick')
  await expect(page.getByLabel('AutoDJ mix style')).toHaveValue('quick')
  await page.getByRole('button', { name: 'Enable Full AutoDJ' }).click()

  for (let mixNumber = 1; mixNumber <= 5; mixNumber += 1) {
    await expect(panel).toContainText('NEXT TRACK', { timeout: 10_000 })
    await forcePreparedDeckBpm(page, panel)

    const referenceDeck = await getReferenceDeck(page)
    await page.getByLabel(`Seek deck ${referenceDeck}`, { exact: true }).fill('7')

    await expect(panel).toContainText('MIXING', { timeout: 5_000 })
    await expect(page.getByLabel('Completed AutoDJ mixes')).toContainText(String(mixNumber), {
      timeout: 12_000,
    })

    await expect(async () => {
      const nextReferenceDeck = await getReferenceDeck(page)
      expect(nextReferenceDeck).not.toBe(referenceDeck)
    }).toPass({ timeout: 5_000, intervals: [100, 250, 500] })
  }

  await expect(page.getByRole('button', { name: 'Take over from Full AutoDJ' })).toBeVisible()
  await expect(panel).not.toContainText('ERROR')
})
