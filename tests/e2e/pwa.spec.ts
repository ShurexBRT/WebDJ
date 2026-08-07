import { expect, test } from '@playwright/test'

test('publishes an installable manifest and offline shell worker', async ({ page, request }) => {
  await page.goto('/')

  await expect(page.locator('.studio-brand-icon')).toHaveAttribute('src', '/WebDJ/icons/webdj.svg')
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(manifestHref).toBe('/WebDJ/manifest.webmanifest')

  const manifestResponse = await request.get(new URL(manifestHref!, page.url()).toString())
  expect(manifestResponse.ok()).toBe(true)
  const manifest = await manifestResponse.json()
  expect(manifest).toMatchObject({
    name: 'WebDJ Studio',
    short_name: 'WebDJ',
    display: 'standalone',
    orientation: 'landscape',
  })

  const workerResponse = await request.get(new URL('/WebDJ/sw.js', page.url()).toString())
  expect(workerResponse.ok()).toBe(true)
  const worker = await workerResponse.text()
  expect(worker).toContain("const CACHE_PREFIX = 'webdj-shell-'")
  expect(worker).toContain("const CACHE_VERSION = `${CACHE_PREFIX}v3`")
  expect(worker).toContain("request.headers.has('range')")
  expect(worker).toContain("request.destination === 'audio'")
})

test('shows offline status and an install action only when relevant', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Application install and offline status', exact: true })).toHaveCount(0)

  await page.evaluate(() => window.dispatchEvent(new Event('offline')))
  const pwaControls = page.getByRole('region', { name: 'Application install and offline status', exact: true })
  await expect(pwaControls).toContainText('OFFLINE')

  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await expect(pwaControls).toHaveCount(0)

  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
      prompt: () => Promise<void>
      userChoice: Promise<{ outcome: 'accepted'; platform: string }>
    }
    event.prompt = async () => undefined
    event.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' })
    window.dispatchEvent(event)
  })
  await expect(page.getByRole('button', { name: 'Install WebDJ', exact: true })).toBeVisible()
})
