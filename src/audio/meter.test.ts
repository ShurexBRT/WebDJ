import { describe, expect, it } from 'vitest'
import { clampLevel, decibelsToGain, levelFromRms, rmsFromTimeDomain } from './meter'

describe('audio meter utilities', () => {
  it('returns zero for silence', () => {
    expect(rmsFromTimeDomain(new Uint8Array([128, 128, 128, 128]))).toBe(0)
    expect(levelFromRms(0)).toBe(0)
  })

  it('produces a normalized level for a signal', () => {
    const rms = rmsFromTimeDomain(new Uint8Array([0, 255, 0, 255]))
    expect(rms).toBeGreaterThan(0.9)
    expect(levelFromRms(rms)).toBeGreaterThan(0.9)
  })

  it('clamps levels and trim gain safely', () => {
    expect(clampLevel(-2)).toBe(0)
    expect(clampLevel(3)).toBe(1)
    expect(decibelsToGain(0)).toBe(1)
    expect(decibelsToGain(12)).toBeCloseTo(3.981, 3)
    expect(decibelsToGain(-12)).toBeCloseTo(0.251, 3)
  })
})
