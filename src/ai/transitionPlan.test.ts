import { describe, expect, it } from 'vitest'
import { createAutoTransitionPlan, crossfaderForTarget, transitionBeats, transitionFrame } from './transitionPlan'

describe('auto-transition plans', () => {
  it('uses phrase-sized transition lengths per mix profile', () => {
    expect(transitionBeats('long-blend', 'smooth')).toBe(128)
    expect(transitionBeats('bass-swap', 'club')).toBe(32)
    expect(transitionBeats('filter-blend', 'deep')).toBe(64)
    expect(transitionBeats('echo-out', 'quick')).toBe(8)
    expect(transitionBeats('hard-cut', 'quick')).toBe(2)
  })

  it('stores the chosen mix profile on the prepared plan', () => {
    const plan = createAutoTransitionPlan({ trackId: 'next', transition: 'filter-blend', score: 88 }, 'Next', 'A', 'B', 'deep')
    expect(plan).toMatchObject({ profileId: 'deep', beats: 64, outgoingDeck: 'A', targetDeck: 'B' })
  })

  it('performs a bass swap around the middle of a long blend', () => {
    const start = transitionFrame('long-blend', 0)
    const middle = transitionFrame('long-blend', 0.5)
    const end = transitionFrame('long-blend', 1)
    expect(start.targetLowDb).toBe(-24)
    expect(middle.outgoingLowDb).toBeLessThan(0)
    expect(middle.targetLowDb).toBeGreaterThan(-24)
    expect(end.outgoingLowDb).toBe(-24)
    expect(end.targetLowDb).toBe(0)
    expect(end.targetMix).toBe(1)
  })

  it('combines filter movement with a low-end handoff', () => {
    const start = transitionFrame('filter-blend', 0)
    const middle = transitionFrame('filter-blend', 0.5)
    const end = transitionFrame('filter-blend', 1)
    expect(start.targetFilter).toBeCloseTo(-0.68)
    expect(start.targetLowDb).toBe(-24)
    expect(middle.outgoingLowDb).toBeLessThan(0)
    expect(end.targetFilter).toBe(0)
    expect(end.outgoingFilter).toBeCloseTo(0.86)
    expect(end.targetLowDb).toBe(0)
  })

  it('maps target mix to the correct crossfader direction', () => {
    expect(crossfaderForTarget('A', 0)).toBe(-1)
    expect(crossfaderForTarget('A', 1)).toBe(1)
    expect(crossfaderForTarget('B', 0)).toBe(1)
    expect(crossfaderForTarget('B', 1)).toBe(-1)
  })
})
