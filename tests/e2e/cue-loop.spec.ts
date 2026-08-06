import { expect, test } from '@playwright/test'
import { testWavFile } from './fixtures/audio'

test('shows independent cue point and loop controls for both decks', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('region', { name: 'Cue and loop deck A' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Cue and loop deck B' })).toBeVisible()
  await expect(page.getByLabel('Set cue point deck A')).toBeDisabled()
  await expect(page.getByLabel('Return to cue point deck A')).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Loop deck A', exact: true })).toBeDisabled()
  await expect(page.getByLabel('4 beat loop deck A')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('4 beat loop deck B')).toHaveAttribute('aria-pressed', 'true')
})

test('changes loop size independently per deck', async ({ page }) => {
  await page.goto('/')

  await page.getByLabel('8 beat loop deck A').click()
  await page.getByLabel('2 beat loop deck B').click()

  await expect(page.getByLabel('8 beat loop deck A')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('4 beat loop deck A')).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByLabel('2 beat loop deck B')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('4 beat loop deck B')).toHaveAttribute('aria-pressed', 'false')
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
