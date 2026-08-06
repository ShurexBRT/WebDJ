import { expect, test } from '@playwright/test'
import { testWavFile } from './fixtures/audio'

test('shows independent cue loop and beat jump controls for both decks', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('region', { name: 'Cue and loop deck A' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Cue and loop deck B' })).toBeVisible()
  await expect(page.getByLabel('Set cue point deck A')).toBeDisabled()
  await expect(page.getByLabel('Return to cue point deck A')).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Loop deck A', exact: true })).toBeDisabled()
  await expect(page.getByLabel('Beat jump backward deck A')).toBeDisabled()
  await expect(page.getByLabel('Beat jump forward deck B')).toBeDisabled()
  await expect(page.getByLabel('4 beat loop deck A')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('4 beat loop deck B')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('4 beat jump deck A')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('4 beat jump deck B')).toHaveAttribute('aria-pressed', 'true')
})

test('changes loop and beat jump sizes independently per deck', async ({ page }) => {
  await page.goto('/')

  await page.getByLabel('8 beat loop deck A').click()
  await page.getByLabel('2 beat loop deck B').click()
  await page.getByLabel('16 beat jump deck A').click()
  await page.getByLabel('1 beat jump deck B').click()

  await expect(page.getByLabel('8 beat loop deck A')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('4 beat loop deck A')).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByLabel('2 beat loop deck B')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('4 beat loop deck B')).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByLabel('16 beat jump deck A')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('4 beat jump deck A')).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByLabel('1 beat jump deck B')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('4 beat jump deck B')).toHaveAttribute('aria-pressed', 'false')
})

test('wraps and resizes an active beat loop on the audio thread', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('file-input-A').setInputFiles(testWavFile('loop-clock.wav', 4, 330))

  const seek = page.getByLabel('Seek deck A', { exact: true })
  await expect(seek).toBeEnabled()
  await page.getByLabel('BPM deck A', { exact: true }).fill('120')
  await page.getByLabel('1 beat loop deck A', { exact: true }).click()

  const loopButton = page.getByRole('button', { name: 'Loop deck A', exact: true })
  await loopButton.click()
  await expect(loopButton).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: 'Play deck A', exact: true }).click()
  await page.waitForTimeout(850)
  const wrappedTime = Number(await seek.inputValue())
  expect(wrappedTime).toBeGreaterThan(0.05)
  expect(wrappedTime).toBeLessThan(0.55)

  await page.getByLabel('2 beat loop deck A', { exact: true }).click()
  await expect(page.getByLabel('2 beat loop deck A', { exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.waitForTimeout(800)
  expect(Number(await seek.inputValue())).toBeLessThan(1.05)

  await loopButton.click()
  await expect(loopButton).toHaveAttribute('aria-pressed', 'false')
  const releasedAt = Number(await seek.inputValue())
  await page.waitForTimeout(500)
  expect(Number(await seek.inputValue())).toBeGreaterThan(releasedAt + 0.3)
})

test('keeps phrase controls on the original BPM grid and moves an active loop intact', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('file-input-A').setInputFiles(testWavFile('phrase-jump.wav', 12, 220))

  const panel = page.getByRole('region', { name: 'Cue and loop deck A', exact: true })
  const seek = page.getByLabel('Seek deck A', { exact: true })
  await page.getByLabel('BPM deck A', { exact: true }).fill('120')
  await page.getByLabel('Pitch deck A', { exact: true }).fill('10')
  await page.getByLabel('8 beat loop deck A', { exact: true }).click()
  await page.getByLabel('8 beat jump deck A', { exact: true }).click()

  const loopButton = page.getByRole('button', { name: 'Loop deck A', exact: true })
  await loopButton.click()
  await expect(panel).toContainText('00:00 – 00:04')

  await page.getByRole('button', { name: 'Play deck A', exact: true }).click()
  await page.waitForTimeout(450)
  const relativeBeforeJump = Number(await seek.inputValue())
  expect(relativeBeforeJump).toBeGreaterThan(0.2)
  expect(relativeBeforeJump).toBeLessThan(1)

  await page.getByLabel('Beat jump forward deck A', { exact: true }).click()
  await expect(panel).toContainText('00:04 – 00:08')
  const shiftedTime = Number(await seek.inputValue())
  expect(shiftedTime).toBeGreaterThan(4.2)
  expect(shiftedTime).toBeLessThan(5)

  await page.waitForTimeout(350)
  const continuedTime = Number(await seek.inputValue())
  expect(continuedTime).toBeGreaterThan(shiftedTime + 0.2)
  expect(continuedTime).toBeLessThan(8)

  await page.getByLabel('Beat jump backward deck A', { exact: true }).click()
  await expect(panel).toContainText('00:00 – 00:04')
  expect(Number(await seek.inputValue())).toBeLessThan(4)
})

test('jumps a non-looping deck by the selected number of base-BPM beats', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('file-input-B').setInputFiles(testWavFile('plain-jump.wav', 12, 550))

  const seek = page.getByLabel('Seek deck B', { exact: true })
  await page.getByLabel('BPM deck B', { exact: true }).fill('120')
  await seek.fill('2')
  await page.getByLabel('8 beat jump deck B', { exact: true }).click()

  await page.getByLabel('Beat jump forward deck B', { exact: true }).click()
  await expect(seek).toHaveValue('6')
  await page.getByLabel('Beat jump backward deck B', { exact: true }).click()
  await expect(seek).toHaveValue('2')

  await page.getByLabel('16 beat jump deck B', { exact: true }).click()
  await page.getByLabel('Beat jump backward deck B', { exact: true }).click()
  await expect(seek).toHaveValue('0')
})
