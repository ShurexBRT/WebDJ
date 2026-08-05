import { describe, expect, it } from 'vitest'
import { beatIntervalSeconds, buildBeatGrid, normalizeBeatOffset } from './beatGrid'

describe('beat grid', () => {
  it('converts BPM into a beat interval', () => {
    expect(beatIntervalSeconds(120)).toBe(0.5)
    expect(beatIntervalSeconds(0)).toBeNull()
  })

  it('builds beat and bar-start markers across the track', () => {
    const markers = buildBeatGrid(2.1, 120)
    expect(markers.map((marker) => marker.time)).toEqual([0, 0.5, 1, 1.5, 2])
    expect(markers.map((marker) => marker.isBarStart)).toEqual([true, false, false, false, true])
  })

  it('wraps negative and oversized offsets into one beat interval', () => {
    expect(normalizeBeatOffset(-0.1, 120)).toBe(0.4)
    expect(normalizeBeatOffset(0.6, 120)).toBe(0.1)
  })

  it('returns no markers for invalid duration or BPM', () => {
    expect(buildBeatGrid(0, 120)).toEqual([])
    expect(buildBeatGrid(30, 0)).toEqual([])
  })
})
