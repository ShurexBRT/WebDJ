import { expect, test } from '@playwright/test'

const fakeAudio = {
  name: 'persistent-track.wav',
  mimeType: 'audio/wav',
  buffer: Buffer.from('RIFF0000WAVEfmt persistent profile payload'),
}

test('restores global mixer session settings after reload', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Quantize', exact: true }).click()
  await page.getByLabel('Crossfader', { exact: true }).fill('0.45')
  await page.getByRole('button', { name: 'Make deck B master', exact: true }).click()
  await page.getByLabel('Master volume', { exact: true }).fill('0.72')
  await page.waitForTimeout(250)

  await page.reload()

  await expect(page.getByRole('button', { name: 'Quantize', exact: true })).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByLabel('Crossfader', { exact: true })).toHaveValue('0.45')
  await expect(page.getByRole('button', { name: 'Make deck B master', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('Master volume', { exact: true })).toHaveValue('0.72')
})

test('restores BPM cues and loop preference when the same local file is loaded again', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('file-input-A').setInputFiles(fakeAudio)
  await expect(page.getByTestId('deck-A')).toContainText('persistent-track.wav')

  await page.getByLabel('BPM deck A', { exact: true }).fill('123.4')
  await page.getByRole('button', { name: 'Hot cue A deck A', exact: true }).click()
  await page.getByRole('button', { name: '8 beat loop deck A', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Hot cue A deck A', exact: true })).toHaveClass(/set/)
  await page.waitForTimeout(600)

  await page.reload()
  await page.getByTestId('file-input-A').setInputFiles(fakeAudio)

  await expect(page.getByLabel('BPM deck A', { exact: true })).toHaveValue('123.4')
  await expect(page.getByRole('button', { name: 'Hot cue A deck A', exact: true })).toHaveClass(/set/)
  await expect(page.getByRole('button', { name: '8 beat loop deck A', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('deck-A')).toContainText('Cached local profile')
})
