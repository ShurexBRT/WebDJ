import { expect, test } from '@playwright/test'

const fakeAudio = {
  name: 'test-tone.wav',
  mimeType: 'audio/wav',
  buffer: Buffer.from('RIFF0000WAVEfmt '),
}

test('renders the complete dual-deck workspace', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText('WebDJ')).toBeVisible()
  await expect(page.getByTestId('deck-A')).toBeVisible()
  await expect(page.getByTestId('deck-B')).toBeVisible()
  await expect(page.getByLabel('Crossfader')).toHaveValue('0')
  await expect(page.getByLabel('Master volume')).toHaveValue('0.9')
  await expect(page.getByLabel('Cue volume')).toHaveValue('0.8')
  await expect(page.getByLabel('Cue master mix')).toHaveValue('0')
  await expect(page.getByRole('meter', { name: 'Deck A level' })).toBeVisible()
  await expect(page.getByRole('meter', { name: 'Deck B level' })).toBeVisible()
  await expect(page.getByRole('meter', { name: 'Master level' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Effects deck A' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Effects deck B' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Tempo deck A' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Tempo deck B' })).toBeVisible()
})

test('loads independent local files into both decks', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('file-input-A').setInputFiles(fakeAudio)
  await page.getByTestId('file-input-B').setInputFiles({ ...fakeAudio, name: 'second-track.wav' })
  await expect(page.getByTestId('deck-A')).toContainText('test-tone.wav')
  await expect(page.getByTestId('deck-B')).toContainText('second-track.wav')
  await expect(page.getByLabel('Play deck A')).toBeEnabled()
  await expect(page.getByLabel('Play deck B')).toBeEnabled()
})

test('changes gain and mixer controls without coupling the decks', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Trim deck A').fill('6')
  await page.getByLabel('Channel level deck A').fill('0.25')
  await page.getByLabel('low EQ deck B').fill('-12')
  await page.getByLabel('Master volume').fill('0.65')
  await page.getByLabel('Crossfader').fill('1')
  await expect(page.getByLabel('Trim deck A')).toHaveValue('6')
  await expect(page.getByLabel('Trim deck B')).toHaveValue('0')
  await expect(page.getByLabel('Channel level deck A')).toHaveValue('0.25')
  await expect(page.getByLabel('Channel level deck B')).toHaveValue('0.8')
  await expect(page.getByLabel('low EQ deck B')).toHaveValue('-12')
  await expect(page.getByLabel('Master volume')).toHaveValue('0.65')
  await expect(page.getByLabel('Crossfader')).toHaveValue('1')
})

test('sets pitch independently and syncs one deck BPM to the other', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByLabel('Sync deck B to deck A')).toBeDisabled()
  await page.getByLabel('BPM deck A').fill('120')
  await page.getByLabel('BPM deck B').fill('125')
  await page.getByLabel('Pitch deck A').fill('4')

  await expect(page.getByLabel('Pitch deck A')).toHaveValue('4')
  await expect(page.getByLabel('Pitch deck B')).toHaveValue('0')
  await expect(page.getByLabel('Sync deck B to deck A')).toBeEnabled()

  await page.getByLabel('Sync deck B to deck A').click()
  await expect(page.getByLabel('Pitch deck B')).toHaveValue('-0.2')
})

test('keeps filter echo and reverb independent per deck', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Filter deck A').fill('-0.65')
  await page.getByLabel('Echo deck A').click()
  await page.getByLabel('Echo mix deck A').fill('0.55')
  await page.getByLabel('Reverb deck B').click()
  await page.getByLabel('Reverb mix deck B').fill('0.4')

  await expect(page.getByLabel('Filter deck A')).toHaveValue('-0.65')
  await expect(page.getByLabel('Filter deck B')).toHaveValue('0')
  await expect(page.getByLabel('Echo deck A')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('Echo deck B')).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByLabel('Echo mix deck A')).toHaveValue('0.55')
  await expect(page.getByLabel('Reverb deck B')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('Reverb mix deck B')).toHaveValue('0.4')
})

test('toggles cue independently and adjusts headphone monitoring', async ({ page }) => {
  await page.goto('/')
  const cueA = page.getByLabel('Cue deck A')
  const cueB = page.getByLabel('Cue deck B')
  await cueA.click()
  await expect(cueA).toHaveAttribute('aria-pressed', 'true')
  await expect(cueB).toHaveAttribute('aria-pressed', 'false')
  await cueB.click()
  await expect(cueA).toHaveAttribute('aria-pressed', 'true')
  await expect(cueB).toHaveAttribute('aria-pressed', 'true')
  await page.getByLabel('Cue volume').fill('0.35')
  await page.getByLabel('Cue master mix').fill('0.7')
  await expect(page.getByLabel('Cue volume')).toHaveValue('0.35')
  await expect(page.getByLabel('Cue master mix')).toHaveValue('0.7')
})

test('shows audio output settings with safe defaults', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Audio output settings' })).toBeVisible()
  await expect(page.getByLabel('Master output')).toHaveValue('default')
  await expect(page.getByLabel('Cue output')).toHaveValue('default')
  await expect(page.getByRole('button', { name: /Detect devices/i })).toBeVisible()
})
