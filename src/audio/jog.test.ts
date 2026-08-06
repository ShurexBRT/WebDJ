import { describe, expect, it } from 'vitest'
import {
  clampJogSeek,
  jogRateMultiplierFromMotion,
  pointerAngle,
  scrubSecondsFromAngle,
  shortestAngularDelta,
} from './jog'

describe('jog wheel math', () => {
  it('calculates pointer angles around a platter center', () => {
    expect(pointerAngle(100, 100, 200, 100)).toBeCloseTo(0)
    expect(pointerAngle(100, 100, 100, 200)).toBeCloseTo(Math.PI / 2)
    expect(pointerAngle(100, 100, 0, 100)).toBeCloseTo(Math.PI)
  })

  it('uses the shortest angular path across the wrap boundary', () => {
    const previous = 350 * Math.PI / 180
    const next = 10 * Math.PI / 180
    expect(shortestAngularDelta(previous, next)).toBeCloseTo(20 * Math.PI / 180)
    expect(shortestAngularDelta(next, previous)).toBeCloseTo(-20 * Math.PI / 180)
  })

  it('maps platter rotation to bounded paused scrubbing', () => {
    expect(scrubSecondsFromAngle(Math.PI, 4)).toBeCloseTo(2)
    expect(scrubSecondsFromAngle(-Math.PI / 2, 4)).toBeCloseTo(-1)
    expect(clampJogSeek(2, 1.5, 10)).toBeCloseTo(3.5)
    expect(clampJogSeek(0.2, -1, 10)).toBe(0)
    expect(clampJogSeek(9.5, 3, 10)).toBe(10)
  })

  it('turns angular velocity into a safe temporary rate multiplier', () => {
    expect(jogRateMultiplierFromMotion(Math.PI / 2, 250)).toBeCloseTo(1.35)
    expect(jogRateMultiplierFromMotion(-Math.PI / 2, 250)).toBeCloseTo(0.65)
    expect(jogRateMultiplierFromMotion(Math.PI * 4, 50)).toBe(1.5)
    expect(jogRateMultiplierFromMotion(-Math.PI * 4, 50)).toBe(0.5)
    expect(jogRateMultiplierFromMotion(Math.PI, 0)).toBe(1)
  })
})
