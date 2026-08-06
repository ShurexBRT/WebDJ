import { act, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PwaControls } from './PwaControls'

describe('PwaControls', () => {
  it('appears for offline status and a browser install prompt', async () => {
    render(<PwaControls />)
    expect(screen.queryByRole('region', { name: 'Application install and offline status' })).not.toBeInTheDocument()

    act(() => window.dispatchEvent(new Event('offline')))
    expect(screen.getByRole('region', { name: 'Application install and offline status' })).toHaveTextContent('OFFLINE')

    act(() => window.dispatchEvent(new Event('online')))
    expect(screen.queryByRole('region', { name: 'Application install and offline status' })).not.toBeInTheDocument()

    const installEvent = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
      prompt: () => Promise<void>
      userChoice: Promise<{ outcome: 'accepted'; platform: string }>
    }
    installEvent.prompt = async () => undefined
    installEvent.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' })

    act(() => window.dispatchEvent(installEvent))
    expect(screen.getByRole('button', { name: 'Install WebDJ' })).toBeVisible()
  })
})
