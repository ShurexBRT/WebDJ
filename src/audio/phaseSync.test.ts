import { describe, expect, it } from 'vitest'
import {
  beatDurationSeconds,
  beatPhase,
  nudgePlaybackRate,
  phaseAlignedTime,
  phaseLabel,
  quantizeTime,
  signedPhaseErrorSeconds,
} from './phaseSync'

describe('phase sync math', () => {
  it('calculates beat duration and normalized phase', () => {
    expect(beatDurationSeconds(120)).toBe(0.5)
    expect(beatPhase(1.125, 120, 0)).toBeCloseTo(0.25)
    expect(beatPhase(0.1, 120, 0.2)).toBeCloseTo(0.8)
  })

  it('returns the shortest signed phase correction', () => {
    expect(signedPhaseErrorSeconds(10.1, 120, 0, 20.2, 120, 0)).toBeCloseTo(0.1)
    expect(signedPhaseErrorSeconds(10.45, 120, 0, 20.05, 120, 0)).toBeCloseTo(0.1)
  })

  it('aligns target time without seeking before zero', () => {
    expect(phaseAlignedTime(10.1, 120, 0, 20.2, 120, 0)).toBeCloseTo(10.2)
    expect(phaseAlignedTime(0.05, 120, 0, 0.45, 120, 0)).toBeCloseTo(0)
  })

  it('quantizes to beat subdivisions', () => {
    expect(quantizeTime(4.23, 120)).toBeCloseTo(4.0)
    expect(quantizeTime(4.23, 120, 0, 2)).toBeCloseTo(4.25)
    expect(quantizeTime(4.23, 120, 0.1, 1)).toBeCloseTo(4.1)
  })

  it('creates bounded temporary pitch bend rates', () => {
    expect(nudgePlaybackRate(1, 1, 4)).toBeCloseTo(1.04)
    expect(nudgePlaybackRate(1.08, -1, 4)).toBeCloseTo(1.0368)
    expect(nudgePlaybackRate(1, 1, 50)).toBeCloseTo(1.12)
  })

  it('formats phase lock feedback', () => {
    expect(phaseLabel(0.004)).toBe('LOCKED')
    expect(phaseLabel(0.023)).toBe('+23 ms')
    expect(phaseLabel(-0.018)).toBe('-18 ms')
  })
})
