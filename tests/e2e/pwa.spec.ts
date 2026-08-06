import { expect, test } from '@playwright/test'

test('exposes install metadata and offline assets under the WebDJ base path', async ({ page, request }) => {
  await page.goto('/')

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(manifestHref).toContain('/WebDJ/manifest.webmanifest')
  await expect(page.getByRole('status', { name: 'WebDJ online' })).toBeVisible()

  const manifestResponse = await request.get(new URL(manifestHref!, page.url()).href)
  expect(manifestResponse.ok()).toBeTruthy()
  expect((await manifestResponse.json()).name).toBe('WebDJ Studio')

  const workerResponse = await request.get(new URL('/WebDJ/sw.js', page.url()).href)
  expect(workerResponse.ok()).toBeTruthy()
  expect(await workerResponse.text()).toContain('webdj-studio')
})
