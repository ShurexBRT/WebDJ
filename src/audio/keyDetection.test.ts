import { describe, expect, it } from 'vitest'
import {
  camelotForKey,
  compatibilityLabel,
  detectKeyFromChroma,
  formatDetectedKey,
  harmonicCompatibility,
} from './keyDetection'

const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]

const rotateProfile = (profile: number[], root: number) => Array.from(
  { length: 12 },
  (_, pitchClass) => profile[(pitchClass - root + 12) % 12],
)

describe('musical key detection', () => {
  it('detects a C major chroma profile', () => {
    const result = detectKeyFromChroma(MAJOR_PROFILE)
    expect(result).toMatchObject({ root: 0, mode: 'major', key: 'C major', shortKey: 'C', camelot: '8B' })
    expect(result?.confidence).toBeGreaterThan(0)
  })

  it('detects an A minor chroma profile', () => {
    const result = detectKeyFromChroma(rotateProfile(MINOR_PROFILE, 9))
    expect(result).toMatchObject({ root: 9, mode: 'minor', key: 'A minor', shortKey: 'Am', camelot: '8A' })
  })

  it('returns null for silent or incomplete chroma vectors', () => {
    expect(detectKeyFromChroma(Array.from({ length: 12 }, () => 0))).toBeNull()
    expect(detectKeyFromChroma([1, 2, 3])).toBeNull()
  })

  it('maps standard keys to Camelot notation', () => {
    expect(camelotForKey(0, 'major')).toBe('8B')
    expect(camelotForKey(9, 'minor')).toBe('8A')
    expect(formatDetectedKey(6, 'minor')).toMatchObject({ key: 'F♯ minor', shortKey: 'F♯m', camelot: '11A' })
  })
})

describe('harmonic compatibility', () => {
  it('recognizes same, relative, adjacent and energy-shift keys', () => {
    expect(harmonicCompatibility('8A', '8A')).toBe('same')
    expect(harmonicCompatibility('8A', '8B')).toBe('relative')
    expect(harmonicCompatibility('8A', '9A')).toBe('compatible')
    expect(harmonicCompatibility('8A', '10A')).toBe('energy')
  })

  it('labels incompatible and missing keys safely', () => {
    expect(harmonicCompatibility('8A', '3B')).toBe('clash')
    expect(harmonicCompatibility('', '8B')).toBe('unknown')
    expect(compatibilityLabel('clash')).toBe('KEY CLASH')
    expect(compatibilityLabel('unknown')).toBe('KEY —')
  })
})
