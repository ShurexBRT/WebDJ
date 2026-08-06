import { describe, expect, it } from 'vitest'
import { filterFrequencyFromPosition } from './fx'

describe('neutral deck filter', () => {
  it('uses a near-subsonic HPF cutoff at center instead of muting at 20 kHz', () => {
    expect(filterFrequencyFromPosition(0)).toBe(20)
  })
})
