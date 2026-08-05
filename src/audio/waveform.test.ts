import { describe, expect, it } from 'vitest'
import { extractWaveformPeaks, mergeChannelPeaks, normalizePeaks } from './waveform'

describe('waveform utilities', () => {
  it('normalizes peaks to the strongest sample', () => {
    expect(normalizePeaks([0, 2, 1])).toEqual([0, 1, 0.5])
  })

  it('extracts the requested number of bars', () => {
    const data = new Float32Array([0, 0.5, -1, 0.25, 0.75, 0, -0.5, 0.1])
    expect(extractWaveformPeaks(data, 4)).toHaveLength(4)
    expect(extractWaveformPeaks(data, 4)).toEqual([0.5, 1, 0.75, 0.5])
  })

  it('merges stereo channels without exceeding one', () => {
    const left = new Float32Array([1, 0, 0, 0])
    const right = new Float32Array([0, 0, 1, 0])
    expect(mergeChannelPeaks([left, right], 2)).toEqual([0.5, 0.5])
  })

  it('handles empty audio safely', () => {
    expect(extractWaveformPeaks(new Float32Array(), 10)).toEqual([])
    expect(mergeChannelPeaks([], 10)).toEqual([])
  })
})
