import { describe, expect, it } from 'vitest'
import { formatTime, progressFromTime, timeFromProgress } from './transport'

describe('transport utilities', () => {
  it('formats time safely', () => {
    expect(formatTime(0)).toBe('00:00')
    expect(formatTime(65.9)).toBe('01:05')
    expect(formatTime(Number.NaN)).toBe('00:00')
  })

  it('converts time to clamped progress', () => {
    expect(progressFromTime(30, 120)).toBe(0.25)
    expect(progressFromTime(150, 120)).toBe(1)
    expect(progressFromTime(1, 0)).toBe(0)
  })

  it('converts progress to clamped time', () => {
    expect(timeFromProgress(0.5, 120)).toBe(60)
    expect(timeFromProgress(-1, 120)).toBe(0)
    expect(timeFromProgress(2, 120)).toBe(120)
  })
})
