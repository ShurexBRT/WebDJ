import { expect, test } from '@playwright/test'
import { testWavFile } from './fixtures/audio'

const normalizedBeatPhase = (timeSeconds: number, bpm: number) => {
  const beatDuration = 60 / bpm
  return ((timeSeconds % beatDuration) + beatDuration) % beatDuration / beatDuration
}

const circularPhaseDistance = (left: number, right: number) => {
  const raw = Math.abs(left - right)
  return Math.min(raw, 1 - raw)
}

test('matches tempo and launches a paused slave on the next master beat', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('file-input-A').setInputFiles(testWavFile('master-grid.wav', 5, 330))
  await page.getByTestId('file-input-B').setInputFiles(testWavFile('slave-grid.wav', 5, 550))

  await expect(page.getByLabel('Seek deck A', { exact: true })).toBeEnabled()
  await expect(page.getByLabel('Seek deck B', { exact: true })).toBeEnabled()
  await expect(page.getByLabel('BPM analysis deck A', { exact: true })).not.toContainText('Analyzing BPM')
  await expect(page.getByLabel('BPM analysis deck B', { exact: true })).not.toContainText('Analyzing BPM')

  await page.getByLabel('BPM deck A', { exact: true }).fill('120')
  await page.getByLabel('BPM deck B', { exact: true }).fill('125')
  await page.getByRole('button', { name: 'Make deck A master', exact: true }).click()
  await page.getByRole('button', { name: 'Play deck A', exact: true }).click()
  await page.waitForTimeout(180)

  await page.getByRole('button', { name: 'Sync deck B to deck A', exact: true }).click()
  await expect(page.getByLabel('Pitch deck B', { exact: true })).toHaveValue('-4')
  await expect(page.getByRole('button', { name: 'Pause deck B', exact: true })).toBeVisible()

  await page.waitForTimeout(850)
  const masterTime = Number(await page.getByLabel('Seek deck A', { exact: true }).inputValue())
  const slaveTime = Number(await page.getByLabel('Seek deck B', { exact: true }).inputValue())
  const masterPhase = normalizedBeatPhase(masterTime, 120)
  const slavePhase = normalizedBeatPhase(slaveTime, 125)

  expect(masterTime).toBeGreaterThan(0.8)
  expect(slaveTime).toBeGreaterThan(0.35)
  expect(circularPhaseDistance(masterPhase, slavePhase)).toBeLessThan(0.16)
})
