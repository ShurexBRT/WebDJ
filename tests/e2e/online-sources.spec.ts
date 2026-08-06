import { expect, test } from '@playwright/test'

test('searches Jamendo and loads a result through the shared deck pipeline', async ({ page }) => {
  await page.route('https://api.jamendo.com/v3.0/tracks/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        headers: { status: 'success', code: 0 },
        results: [{
          id: 'jam-42',
          name: 'Open House Tool',
          artist_name: 'Jam Artist',
          album_name: 'Browser Sessions',
          duration: 198,
          image: 'https://images.example/cover.jpg',
          shareurl: 'https://jamendo.example/track/42',
          audio: 'https://audio.example/track.mp3',
          audiodownload_allowed: false,
          audiodownload: '',
          musicinfo: { tags: { genres: ['House'] } },
        }],
      }),
    })
  })
  // Playwright evaluates matching routes in reverse registration order, so the
  // specific stream route must be registered after the generic search route.
  await page.route('https://api.jamendo.com/v3.0/tracks/file/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'audio/mpeg',
      body: Buffer.from('mock jamendo audio'),
    })
  })

  await page.goto('/')
  await page.getByRole('button', { name: 'Jamendo', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Jamendo music browser', exact: true })).toBeVisible()
  await page.getByLabel('Jamendo Client ID', { exact: true }).fill('client-test')
  await page.getByLabel('Search Jamendo', { exact: true }).fill('open house')
  await page.getByRole('button', { name: 'SEARCH', exact: true }).click()

  const results = page.getByRole('table', { name: 'Jamendo search results', exact: true })
  await expect(results).toContainText('Open House Tool')
  await expect(results).toContainText('Jam Artist')
  await page.getByRole('button', { name: 'A', exact: true }).click()
  await expect(page.getByTestId('deck-A')).toContainText('Jam Artist - Open House Tool.mp3')
})

test('shows credential requirements without making source requests', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Audius', exact: true }).click()
  const browser = page.getByRole('region', { name: 'Audius music browser', exact: true })
  await expect(browser).toBeVisible()
  await expect(page.getByRole('button', { name: 'SEARCH', exact: true })).toBeDisabled()
  await expect(browser).toContainText('No bearer tokens')
})
