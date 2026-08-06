import { describe, expect, it } from 'vitest'
import { isClipRisk, recommendTrimDb } from './mastering'

describe('gain assist', () => {
  it('targets a conservative RMS while respecting peak headroom', () => {
    expect(recommendTrimDb(-20, -8)).toBe(4)
    expect(recommendTrimDb(-24, -2)).toBe(1)
    expect(recommendTrimDb(-10, -1)).toBe(-6)
  })

  it('clamps extreme corrections and rejects invalid analysis', () => {
    expect(recommendTrimDb(-40, -30)).toBe(6)
    expect(recommendTrimDb(0, 0)).toBe(-12)
    expect(recommendTrimDb(Number.NaN, -3)).toBe(0)
  })
})

describe('master safety', () => {
  it('flags pre-limiter peaks and meaningful limiter reduction', () => {
    expect(isClipRisk(0.99, 0)).toBe(true)
    expect(isClipRisk(0.5, 2)).toBe(true)
    expect(isClipRisk(0.5, 0.8)).toBe(false)
  })
})
