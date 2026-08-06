import { describe, expect, it } from 'vitest'
import { SlipTimeline } from './slipTimeline'

describe('slip timeline', () => {
  it('keeps advancing behind audible seeks and returns when the final owner releases', () => {
    const timeline = new SlipTimeline()

    expect(timeline.begin('loop', 12, 100, 1, 180)).toBe(true)
    expect(timeline.hiddenPositionAt(104)).toBe(16)

    timeline.begin('hot-cue-a', 4, 104, 1, 180)
    expect(timeline.end('hot-cue-a', 106)).toEqual({ active: true, returnTime: null })
    expect(timeline.end('loop', 108)).toEqual({ active: false, returnTime: 20 })
  })

  it('reanchors the hidden clock when pitch changes without jumping', () => {
    const timeline = new SlipTimeline()
    timeline.begin('loop', 20, 10, 1, 120)

    timeline.setPlaybackRate(14, 1.25)
    expect(timeline.hiddenPositionAt(14)).toBe(24)
    expect(timeline.hiddenPositionAt(18)).toBe(29)
  })

  it('can cancel either at the audible position or the hidden timeline', () => {
    const timeline = new SlipTimeline()
    timeline.begin('beat-jump', 30, 50, 1, 100)

    expect(timeline.cancel(53, false)).toEqual({ active: false, returnTime: null })
    expect(timeline.isActive()).toBe(false)

    timeline.begin('hot-cue-b', 40, 60, 1, 100)
    expect(timeline.cancel(64, true)).toEqual({ active: false, returnTime: 44 })
  })

  it('rejects invalid owners and ignores mismatched releases', () => {
    const timeline = new SlipTimeline()
    expect(timeline.begin('  ', 0, 0, 1, 10)).toBe(false)
    expect(timeline.begin('loop', 0, 0, 1, 10)).toBe(true)
    expect(timeline.end('hot-cue', 2)).toEqual({ active: true, returnTime: null })
    expect(timeline.hasOwner('loop')).toBe(true)
  })
})
