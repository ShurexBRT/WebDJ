import { describe, expect, it } from 'vitest'
import { crossfaderForTarget, transitionBeats, transitionFrame } from './transitionPlan'

describe('auto-transition plans', () => {
  it('assigns conservative phrase lengths to each strategy', () => {
    expect(transitionBeats('long-blend')).toBe(32)
    expect(transitionBeats('bass-swap')).toBe(16)
    expect(transitionBeats('filter-blend')).toBe(16)
    expect(transitionBeats('echo-out')).toBe(8)
    expect(transitionBeats('hard-cut')).toBe(1)
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

  it('opens the incoming filter and closes the outgoing filter', () => {
    const start = transitionFrame('filter-blend', 0)
    const end = transitionFrame('filter-blend', 1)
    expect(start.targetFilter).toBeCloseTo(-0.68)
    expect(end.targetFilter).toBe(0)
    expect(end.outgoingFilter).toBeCloseTo(0.86)
  })

  it('maps target mix to the correct crossfader direction', () => {
    expect(crossfaderForTarget('A', 0)).toBe(-1)
    expect(crossfaderForTarget('A', 1)).toBe(1)
    expect(crossfaderForTarget('B', 0)).toBe(1)
    expect(crossfaderForTarget('B', 1)).toBe(-1)
  })
})
