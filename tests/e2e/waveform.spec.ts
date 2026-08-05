import { expect, test } from '@playwright/test'

test.describe('waveform transport', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('renders accessible waveform controls for both decks', async ({ page }) => {
    const deckA = page.getByRole('slider', { name: 'Deck A waveform' })
    const deckB = page.getByRole('slider', { name: 'Deck B waveform' })

    await expect(deckA).toBeVisible()
    await expect(deckB).toBeVisible()
    await expect(deckA).toHaveAttribute('aria-valuemin', '0')
    await expect(deckA).toHaveAttribute('aria-valuemax', '100')
    await expect(deckA).toHaveAttribute('aria-valuenow', '0')
  })

  test('supports keyboard focus without changing unloaded transport state', async ({ page }) => {
    const deckA = page.getByRole('slider', { name: 'Deck A waveform' })

    await deckA.focus()
    await expect(deckA).toBeFocused()
    await deckA.press('ArrowRight')
    await expect(deckA).toHaveAttribute('aria-valuenow', '0')
  })
})
