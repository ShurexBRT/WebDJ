import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { KnobControl } from './KnobControl'

describe('KnobControl', () => {
  it('exposes a real range input and reports changes', () => {
    const onChange = vi.fn()
    render(<KnobControl label="GAIN" ariaLabel="Trim deck A" value={0} min={-12} max={12} step={1} onChange={onChange} />)

    const input = screen.getByRole('slider', { name: 'Trim deck A' })
    expect(input).toHaveValue('0')
    fireEvent.change(input, { target: { value: '6' } })
    expect(onChange).toHaveBeenCalledWith(6)
  })

  it('supports a double click reset action', () => {
    const onReset = vi.fn()
    render(<KnobControl label="FILTER" ariaLabel="Mixer filter deck B" value={0.5} min={-1} max={1} step={0.01} onChange={() => undefined} onDoubleClick={onReset} />)

    fireEvent.doubleClick(screen.getByRole('slider', { name: 'Mixer filter deck B' }))
    expect(onReset).toHaveBeenCalledOnce()
  })
})
