import { describe, expect, it } from 'vitest'
import {
  clampPitchPercent,
  effectiveBpm,
  normalizeBpm,
  pitchToMatchBpm,
  playbackRateFromPitch,
} from './tempo'

describe('tempo helpers', () => {
  it('maps pitch percent to playback rate', () => {
    expect(playbackRateFromPitch(0)).toBe(1)
    expect(playbackRateFromPitch(8)).toBe(1.08)
    expect(playbackRateFromPitch(-8)).toBe(0.92)
  })

  it('clamps pitch to the supported range', () => {
    expect(clampPitchPercent(22)).toBe(16)
    expect(clampPitchPercent(-22)).toBe(-16)
  })

  it('calculates effective BPM', () => {
    expect(effectiveBpm(120, 5)).toBe(126)
    expect(effectiveBpm(0, 5)).toBe(0)
  })

  it('calculates pitch required to match another deck', () => {
    expect(pitchToMatchBpm(120, 126)).toBeCloseTo(5)
    expect(pitchToMatchBpm(0, 126)).toBeNull()
  })

  it('normalizes displayed BPM values', () => {
    expect(normalizeBpm(123.456)).toBe(123.5)
    expect(normalizeBpm(Number.NaN)).toBe(0)
  })
})
