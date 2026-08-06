import { expect, test } from '@playwright/test'
import { testWavFile } from './fixtures/audio'

test('keeps Slip mode independent per deck', async ({ page }) => {
  await page.goto('/')

  const slipA = page.getByRole('button', { name: 'Slip mode deck A', exact: true })
  const slipB = page.getByRole('button', { name: 'Slip mode deck B', exact: true })
  await expect(slipA).toHaveAttribute('aria-pressed', 'false')
  await expect(slipB).toHaveAttribute('aria-pressed', 'false')

  await slipA.click()
  await expect(slipA).toHaveAttribute('aria-pressed', 'true')
  await expect(slipB).toHaveAttribute('aria-pressed', 'false')
})

test('returns from a Slip loop to the hidden running timeline', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('file-input-A').setInputFiles(testWavFile('slip-loop.wav', 6, 330))

  const seek = page.getByLabel('Seek deck A', { exact: true })
  const panel = page.getByRole('region', { name: 'Cue and loop deck A', exact: true })
  await page.getByLabel('BPM deck A', { exact: true }).fill('120')
  await page.getByLabel('1 beat loop deck A', { exact: true }).click()
  await page.getByRole('button', { name: 'Slip mode deck A', exact: true }).click()
  await page.getByRole('button', { name: 'Play deck A', exact: true }).click()
  await page.waitForTimeout(300)

  const loopButton = page.getByRole('button', { name: 'Loop deck A', exact: true })
  await loopButton.click()
  await expect(panel).toContainText('SLIP ACTIVE')

  await page.waitForTimeout(900)
  const audibleLoopTime = Number(await seek.inputValue())
  expect(audibleLoopTime).toBeLessThan(1.1)

  await loopButton.click()
  await expect(panel).not.toContainText('SLIP ACTIVE')
  const returnedTime = Number(await seek.inputValue())
  expect(returnedTime).toBeGreaterThan(1)
  expect(returnedTime).toBeLessThan(2.2)

  await page.waitForTimeout(300)
  expect(Number(await seek.inputValue())).toBeGreaterThan(returnedTime + 0.15)
})
