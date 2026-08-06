import { expect, test } from '@playwright/test'
import { testWavFile } from './fixtures/audio'

test('scrubs a paused deck with platter drag and keyboard control', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('file-input-A').setInputFiles(testWavFile('jog-scrub.wav', 6, 330))

  const jog = page.getByRole('slider', { name: 'Jog wheel deck A', exact: true })
  const seek = page.getByLabel('Seek deck A', { exact: true })
  await expect(jog).toHaveAttribute('aria-disabled', 'false')
  await expect(jog).toHaveAttribute('aria-valuetext', /paused/)

  const box = await jog.boundingBox()
  expect(box).not.toBeNull()
  if (!box) return

  await page.mouse.move(box.x + box.width * 0.82, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(60)
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.82, { steps: 4 })
  await expect(jog).toHaveAttribute('aria-valuetext', /Scrub position/)

  const draggedTime = Number(await seek.inputValue())
  expect(draggedTime).toBeGreaterThan(0.6)
  expect(draggedTime).toBeLessThan(1.5)
  await page.mouse.up()

  await jog.press('ArrowRight')
  const keyboardTime = Number(await seek.inputValue())
  expect(keyboardTime).toBeGreaterThan(draggedTime)

  await jog.press('Home')
  await expect(seek).toHaveValue('0')
  await jog.press('End')
  expect(Number(await seek.inputValue())).toBeCloseTo(6, 1)
})

test('applies temporary pitch bend while playing and restores base pitch on release', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('file-input-A').setInputFiles(testWavFile('jog-bend.wav', 6, 440))
  await page.getByRole('button', { name: 'Play deck A', exact: true }).click()

  const jog = page.getByRole('slider', { name: 'Jog wheel deck A', exact: true })
  const seek = page.getByLabel('Seek deck A', { exact: true })
  const pitch = page.getByLabel('Pitch deck A', { exact: true })
  await page.waitForTimeout(250)
  const beforeBend = Number(await seek.inputValue())

  const box = await jog.boundingBox()
  expect(box).not.toBeNull()
  if (!box) return

  await page.mouse.move(box.x + box.width * 0.82, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(80)
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.82, { steps: 3 })
  await expect(jog).toHaveAttribute('aria-valuetext', /Jog pitch bend/)
  await expect(pitch).toHaveValue('0')
  await page.mouse.up()

  await expect(jog).toHaveAttribute('aria-valuetext', /playing, 0.0 percent pitch/)
  await expect(pitch).toHaveValue('0')
  const afterRelease = Number(await seek.inputValue())
  expect(afterRelease).toBeGreaterThan(beforeBend)

  await page.waitForTimeout(300)
  expect(Number(await seek.inputValue())).toBeGreaterThan(afterRelease)
})
