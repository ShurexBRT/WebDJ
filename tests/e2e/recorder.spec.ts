import { expect, test } from '@playwright/test'

const fakeMediaRecorder = `
class FakeMediaRecorder {
  static isTypeSupported() { return true }
  state = 'inactive'
  mimeType = 'audio/webm;codecs=opus'
  ondataavailable = null
  onstop = null
  onerror = null
  constructor(_stream, options = {}) { if (options.mimeType) this.mimeType = options.mimeType }
  start() { this.state = 'recording' }
  pause() { this.state = 'paused' }
  resume() { this.state = 'recording' }
  stop() {
    this.state = 'inactive'
    this.ondataavailable?.({ data: new Blob(['recorded-mix'], { type: this.mimeType }) })
    setTimeout(() => this.onstop?.(), 0)
  }
}
Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: FakeMediaRecorder })
`

test('records pauses resumes and prepares a master mix download', async ({ page }) => {
  await page.addInitScript({ content: fakeMediaRecorder })
  await page.goto('/')

  await expect(page.getByRole('region', { name: 'Master mix recorder', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Start mix recording', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Pause mix recording', exact: true })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Open mix recorder', exact: true })).toHaveClass(/recording/)

  await page.getByRole('button', { name: 'Pause mix recording', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Resume mix recording', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Resume mix recording', exact: true }).click()
  await page.getByRole('button', { name: 'Stop mix recording', exact: true }).click()

  const download = page.getByRole('link', { name: 'DOWNLOAD MIX', exact: true })
  await expect(download).toBeVisible()
  await expect(download).toHaveAttribute('download', /webdj-mix_.*\.webm/)
})
