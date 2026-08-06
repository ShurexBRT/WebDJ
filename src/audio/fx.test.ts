import { describe, expect, it } from 'vitest'
import { clampFxMix, delaySecondsFromMs, feedbackGain, filterFrequencyFromPosition } from './fx'

describe('FX parameter helpers', () => {
  it('clamps wet mix and feedback safely', () => {
    expect(clampFxMix(-1)).toBe(0)
    expect(clampFxMix(2)).toBe(1)
    expect(feedbackGain(1)).toBe(0.85)
  })

  it('maps filter center to open and sides to audible cutoffs', () => {
    expect(filterFrequencyFromPosition(0)).toBe(20_000)
    expect(filterFrequencyFromPosition(-1)).toBeCloseTo(80)
    expect(filterFrequencyFromPosition(1)).toBeCloseTo(20_000)
  })

  it('converts and clamps delay time for beat-synchronised echoes', () => {
    expect(delaySecondsFromMs(500)).toBe(0.5)
    expect(delaySecondsFromMs(10)).toBe(0.025)
    expect(delaySecondsFromMs(5000)).toBe(4)
    expect(delaySecondsFromMs(5000, 2)).toBe(2)
  })
})
