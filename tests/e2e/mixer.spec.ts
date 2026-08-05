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

test('changes mixer controls without coupling the decks', async ({ page }) => {
  await page.goto('/')

  await page.getByLabel('Channel level deck A').fill('0.25')
  await page.getByLabel('low EQ deck B').fill('-12')
  await page.getByLabel('Crossfader').fill('1')

  await expect(page.getByLabel('Channel level deck A')).toHaveValue('0.25')
  await expect(page.getByLabel('Channel level deck B')).toHaveValue('0.8')
  await expect(page.getByLabel('low EQ deck B')).toHaveValue('-12')
  await expect(page.getByLabel('Crossfader')).toHaveValue('1')
})
