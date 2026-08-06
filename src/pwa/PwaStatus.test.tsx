import { act, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PwaStatus } from './PwaStatus'

describe('PwaStatus', () => {
  it('shows online and offline connection state', () => {
    render(<PwaStatus />)
    expect(screen.getByRole('status', { name: 'WebDJ online' })).toBeInTheDocument()

    act(() => window.dispatchEvent(new Event('offline')))
    expect(screen.getByRole('status', { name: 'WebDJ offline' })).toHaveTextContent('OFFLINE')

    act(() => window.dispatchEvent(new Event('online')))
    expect(screen.getByRole('status', { name: 'WebDJ online' })).toBeInTheDocument()
  })
})
