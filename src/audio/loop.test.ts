import { describe, expect, it } from 'vitest'
import { clampTime, createLoopRange, loopDurationSeconds, shouldWrapLoop } from './loop'

describe('loop helpers', () => {
  it('calculates beat-based loop duration', () => {
    expect(loopDurationSeconds(4, 120)).toBe(2)
    expect(loopDurationSeconds(8, 128)).toBeCloseTo(3.75)
  })

  it('creates and clamps a loop range', () => {
    expect(createLoopRange(10, 180, 4, 120)).toEqual({ start: 10, end: 12 })
    expect(createLoopRange(179, 180, 4, 120)).toEqual({ start: 179, end: 180 })
    expect(createLoopRange(10, 180, 4, 0)).toBeNull()
  })

  it('clamps cue positions and detects wrap points', () => {
    expect(clampTime(-3, 100)).toBe(0)
    expect(clampTime(150, 100)).toBe(100)
    expect(shouldWrapLoop(12, true, 10, 12)).toBe(true)
    expect(shouldWrapLoop(12, false, 10, 12)).toBe(false)
  })
})
