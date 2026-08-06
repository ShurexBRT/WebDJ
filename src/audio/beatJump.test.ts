import { describe, expect, it } from 'vitest'
import {
  beatJumpDeltaSeconds,
  clampBeatJumpTime,
  movePlayheadWithLoop,
  shiftLoopRange,
} from './beatJump'

describe('beat jump transport math', () => {
  it('derives buffer-time jumps from the original track BPM', () => {
    expect(beatJumpDeltaSeconds(1, 1, 120)).toBeCloseTo(0.5)
    expect(beatJumpDeltaSeconds(16, -1, 128)).toBeCloseTo(-7.5)
    expect(beatJumpDeltaSeconds(4, 1, 0)).toBe(0)
  })

  it('clamps non-loop jumps to the decoded track duration', () => {
    expect(clampBeatJumpTime(5, 2, 10)).toBe(7)
    expect(clampBeatJumpTime(1, -4, 10)).toBe(0)
    expect(clampBeatJumpTime(9, 4, 10)).toBe(10)
  })

  it('moves an active loop without changing its length', () => {
    expect(shiftLoopRange({ start: 4, end: 6 }, 2, 20)).toEqual({ start: 6, end: 8 })
    expect(shiftLoopRange({ start: 1, end: 3 }, -4, 20)).toEqual({ start: 0, end: 2 })
    expect(shiftLoopRange({ start: 17, end: 20 }, 8, 20)).toEqual({ start: 17, end: 20 })
  })

  it('preserves the playhead position inside a shifted loop', () => {
    expect(movePlayheadWithLoop(4.75, { start: 4, end: 6 }, { start: 8, end: 10 })).toBeCloseTo(8.75)
    expect(movePlayheadWithLoop(3, { start: 4, end: 6 }, { start: 8, end: 10 })).toBe(8)
    expect(movePlayheadWithLoop(7, { start: 4, end: 6 }, { start: 8, end: 10 })).toBe(10)
  })
})
