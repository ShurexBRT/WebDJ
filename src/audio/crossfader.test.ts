import { describe, expect, it } from 'vitest'
import { calculateCrossfaderGains, clampCrossfader } from './crossfader'

describe('crossfader math', () => {
  it('clamps values to the supported range', () => {
    expect(clampCrossfader(-2)).toBe(-1)
    expect(clampCrossfader(2)).toBe(1)
  })

  it('routes fully to deck A on the left', () => {
    expect(calculateCrossfaderGains(-1)).toEqual({ a: 1, b: 0 })
  })

  it('routes fully to deck B on the right', () => {
    const gains = calculateCrossfaderGains(1)
    expect(gains.a).toBeCloseTo(0, 10)
    expect(gains.b).toBe(1)
  })

  it('uses equal-power gains in the center', () => {
    const gains = calculateCrossfaderGains(0)
    expect(gains.a).toBeCloseTo(Math.SQRT1_2, 10)
    expect(gains.b).toBeCloseTo(Math.SQRT1_2, 10)
  })
})
