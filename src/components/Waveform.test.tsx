import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Waveform } from './Waveform'

const context = {
  scale: vi.fn(),
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  fillStyle: '',
  font: '',
  textAlign: '',
}

describe('Waveform', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 400,
      height: 120,
      top: 0,
      left: 0,
      right: 400,
      bottom: 120,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })
  })

  it('exposes current progress through slider accessibility attributes', () => {
    render(<Waveform peaks={[0.2, 0.8]} progress={0.42} accent="#00aaff" onSeek={() => undefined} label="Deck A waveform" />)

    expect(screen.getByRole('slider', { name: 'Deck A waveform' })).toHaveAttribute('aria-valuenow', '42')
  })

  it('seeks to a pointer position relative to canvas width', () => {
    const onSeek = vi.fn()
    render(<Waveform peaks={[0.2, 0.8]} progress={0} accent="#00aaff" onSeek={onSeek} label="Deck A waveform" />)

    fireEvent.pointerDown(screen.getByRole('slider'), { clientX: 300 })
    expect(onSeek).toHaveBeenCalledWith(0.75)
  })

  it('supports keyboard seeking and clamps at boundaries', () => {
    const onSeek = vi.fn()
    render(<Waveform peaks={[0.2, 0.8]} progress={0.99} accent="#00aaff" onSeek={onSeek} label="Deck A waveform" />)

    const waveform = screen.getByRole('slider')
    fireEvent.keyDown(waveform, { key: 'ArrowRight' })
    fireEvent.keyDown(waveform, { key: 'Home' })
    fireEvent.keyDown(waveform, { key: 'End' })

    expect(onSeek).toHaveBeenNthCalledWith(1, 1)
    expect(onSeek).toHaveBeenNthCalledWith(2, 0)
    expect(onSeek).toHaveBeenNthCalledWith(3, 1)
  })
})
