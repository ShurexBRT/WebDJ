import { expect, test } from '@playwright/test'
import { testWavFile } from './fixtures/audio'

const fakeAudio = testWavFile('test-tone.wav', 2, 440)

test('renders the complete dual-deck workspace', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText('WEB DJ')).toBeVisible()
  await expect(page.getByTestId('deck-A')).toBeVisible()
  await expect(page.getByTestId('deck-B')).toBeVisible()
  await expect(page.getByLabel('Crossfader', { exact: true })).toHaveValue('0')
  await expect(page.getByLabel('Master volume', { exact: true })).toHaveValue('0.9')
  await expect(page.getByLabel('Cue volume', { exact: true })).toHaveValue('0.8')
  await expect(page.getByLabel('Cue master mix', { exact: true })).toHaveValue('0')
  await expect(page.getByRole('meter', { name: 'Deck A level', exact: true })).toBeVisible()
  await expect(page.getByRole('meter', { name: 'Deck B level', exact: true })).toBeVisible()
  await expect(page.getByRole('meter', { name: 'Master level', exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Effects deck A', exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Effects deck B', exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Tempo deck A', exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Tempo deck B', exact: true })).toBeVisible()
  await expect(page.getByLabel('BPM analysis deck A', { exact: true })).toContainText('Load a track for auto BPM')
  await expect(page.getByLabel('BPM analysis deck B', { exact: true })).toContainText('Load a track for auto BPM')
  await expect(page.getByRole('button', { name: 'Nudge deck A slower', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nudge deck B faster', exact: true })).toBeVisible()
})

test('loads independent local files into both decks', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('file-input-A').setInputFiles(fakeAudio)
  await page.getByTestId('file-input-B').setInputFiles(testWavFile('second-track.wav', 2, 660))
  await expect(page.getByTestId('deck-A')).toContainText('test-tone.wav')
  await expect(page.getByTestId('deck-B')).toContainText('second-track.wav')
  await expect(page.getByRole('button', { name: 'Play deck A', exact: true })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Play deck B', exact: true })).toBeEnabled()
  await expect(page.getByLabel('BPM analysis deck A', { exact: true })).toContainText(/Analyzing BPM|BPM not detected/)
})

test('plays pauses and seeks with the precision buffer clock', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('file-input-A').setInputFiles(testWavFile('precision-clock.wav', 3, 330))

  const seek = page.getByLabel('Seek deck A', { exact: true })
  await expect(seek).toBeEnabled()
  await expect(seek).toHaveAttribute('max', /2\.9|3/)

  await page.getByRole('button', { name: 'Play deck A', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Pause deck A', exact: true })).toBeVisible()
  await page.waitForTimeout(350)
  const advanced = Number(await seek.inputValue())
  expect(advanced).toBeGreaterThan(0.15)

  await page.getByRole('button', { name: 'Pause deck A', exact: true }).click()
  const pausedAt = Number(await seek.inputValue())
  await page.waitForTimeout(250)
  expect(Number(await seek.inputValue())).toBeCloseTo(pausedAt, 1)

  await seek.fill('1.2')
  await expect(seek).toHaveValue('1.2')
})

test('changes gain and mixer controls without coupling the decks', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Trim deck A', { exact: true }).fill('6')
  await page.getByLabel('Channel level deck A', { exact: true }).fill('0.25')
  await page.getByLabel('low EQ deck B', { exact: true }).fill('-12')
  await page.getByLabel('Master volume', { exact: true }).fill('0.65')
  await page.getByLabel('Crossfader', { exact: true }).fill('1')
  await expect(page.getByLabel('Trim deck A', { exact: true })).toHaveValue('6')
  await expect(page.getByLabel('Trim deck B', { exact: true })).toHaveValue('0')
  await expect(page.getByLabel('Channel level deck A', { exact: true })).toHaveValue('0.25')
  await expect(page.getByLabel('Channel level deck B', { exact: true })).toHaveValue('0.8')
  await expect(page.getByLabel('low EQ deck B', { exact: true })).toHaveValue('-12')
  await expect(page.getByLabel('Master volume', { exact: true })).toHaveValue('0.65')
  await expect(page.getByLabel('Crossfader', { exact: true })).toHaveValue('1')
})

test('sets a real tempo master without touching the crossfader', async ({ page }) => {
  await page.goto('/')
  const masterA = page.getByRole('button', { name: 'Make deck A master', exact: true })
  const masterB = page.getByRole('button', { name: 'Make deck B master', exact: true })

  await masterA.click()
  await expect(masterA).toHaveAttribute('aria-pressed', 'true')
  await expect(masterB).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByLabel('Crossfader', { exact: true })).toHaveValue('0')

  await masterB.click()
  await expect(masterA).toHaveAttribute('aria-pressed', 'false')
  await expect(masterB).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('Crossfader', { exact: true })).toHaveValue('0')
})

test('sets pitch independently and syncs one deck BPM to the master deck', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Make deck A master', exact: true }).click()
  const syncB = page.getByRole('button', { name: 'Sync deck B to deck A', exact: true })

  await expect(syncB).toBeDisabled()
  await page.getByLabel('BPM deck A', { exact: true }).fill('120')
  await page.getByLabel('BPM deck B', { exact: true }).fill('125')
  await page.getByLabel('Pitch deck A', { exact: true }).fill('4')

  await expect(page.getByLabel('BPM analysis deck A', { exact: true })).toContainText('Manual BPM')
  await expect(page.getByLabel('BPM analysis deck B', { exact: true })).toContainText('Manual BPM')
  await expect(page.getByLabel('Pitch deck A', { exact: true })).toHaveValue('4')
  await expect(page.getByLabel('Pitch deck B', { exact: true })).toHaveValue('0')
  await expect(syncB).toBeEnabled()

  await syncB.click()
  await expect(page.getByLabel('Pitch deck B', { exact: true })).toHaveValue('-0.2')
})

test('keeps filter echo and reverb independent per deck', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Filter deck A', { exact: true }).fill('-0.65')
  await page.getByLabel('Echo deck A', { exact: true }).click()
  await page.getByLabel('Echo mix deck A', { exact: true }).fill('0.55')
  await page.getByLabel('Reverb deck B', { exact: true }).click()
  await page.getByLabel('Reverb mix deck B', { exact: true }).fill('0.4')

  await expect(page.getByLabel('Filter deck A', { exact: true })).toHaveValue('-0.65')
  await expect(page.getByLabel('Filter deck B', { exact: true })).toHaveValue('0')
  await expect(page.getByLabel('Echo deck A', { exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('Echo deck B', { exact: true })).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByLabel('Echo mix deck A', { exact: true })).toHaveValue('0.55')
  await expect(page.getByLabel('Reverb deck B', { exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('Reverb mix deck B', { exact: true })).toHaveValue('0.4')
})

test('toggles cue independently and adjusts headphone monitoring', async ({ page }) => {
  await page.goto('/')
  const cueA = page.getByLabel('Cue deck A', { exact: true })
  const cueB = page.getByLabel('Cue deck B', { exact: true })
  await cueA.click()
  await expect(cueA).toHaveAttribute('aria-pressed', 'true')
  await expect(cueB).toHaveAttribute('aria-pressed', 'false')
  await cueB.click()
  await expect(cueA).toHaveAttribute('aria-pressed', 'true')
  await expect(cueB).toHaveAttribute('aria-pressed', 'true')
  await page.getByLabel('Cue volume', { exact: true }).fill('0.35')
  await page.getByLabel('Cue master mix', { exact: true }).fill('0.7')
  await expect(page.getByLabel('Cue volume', { exact: true })).toHaveValue('0.35')
  await expect(page.getByLabel('Cue master mix', { exact: true })).toHaveValue('0.7')
})

test('shows audio output settings with safe defaults', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Audio output settings', exact: true })).toBeVisible()
  await expect(page.getByLabel('Master output', { exact: true })).toHaveValue('default')
  await expect(page.getByLabel('Cue output', { exact: true })).toHaveValue('default')
  await expect(page.getByRole('button', { name: /Detect devices/i })).toBeVisible()
})
