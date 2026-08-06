import { expect, test } from '@playwright/test'

test('uses keyboard shortcuts without hijacking editable controls', async ({ page }) => {
  await page.goto('/')

  const crossfader = page.getByLabel('Crossfader', { exact: true })
  await expect(crossfader).toHaveValue('0')
  await page.keyboard.press('ArrowRight')
  await expect(crossfader).toHaveValue('0.1')
  await page.keyboard.press('ArrowLeft')
  await expect(crossfader).toHaveValue('0')

  const cueA = page.getByLabel('Cue deck A', { exact: true })
  await page.keyboard.press('KeyA')
  await expect(cueA).toHaveAttribute('aria-pressed', 'true')

  const bpmA = page.getByLabel('BPM deck A', { exact: true })
  await bpmA.focus()
  await page.keyboard.press('ArrowRight')
  await expect(crossfader).toHaveValue('0')
})

test('shows persistent MIDI learn controls with safe defaults', async ({ page }) => {
  await page.goto('/')

  const panel = page.getByRole('region', { name: 'Keyboard and MIDI controls', exact: true })
  await expect(panel).toBeVisible()
  await expect(page.getByLabel('MIDI command', { exact: true })).toHaveValue('playA')
  await expect(page.getByLabel('Learn selected MIDI command', { exact: true })).toBeDisabled()
  await expect(panel).toContainText('No MIDI input connected')
})
