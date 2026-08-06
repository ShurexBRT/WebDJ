import { describe, expect, it } from 'vitest'
import { rankTrackCandidates, scoreTrackCandidate, type TrackIntelligence } from './trackScoring'

const track = (patch: Partial<TrackIntelligence> = {}): TrackIntelligence => ({
  id: 'reference',
  title: 'Reference',
  artist: 'DJ Test',
  genre: 'house',
  bpm: 124,
  camelotKey: '8A',
  rmsDb: -14,
  durationSeconds: 240,
  analysisConfidence: 0.9,
  lastLoadedAt: null,
  ...patch,
})

describe('AI next-track scoring', () => {
  it('rewards close tempo, compatible Camelot key and similar energy', () => {
    const suggestion = scoreTrackCandidate(track(), track({ id: 'candidate', bpm: 125, camelotKey: '9A', rmsDb: -13.5 }))
    expect(suggestion.score).toBeGreaterThan(85)
    expect(suggestion.transition).toBe('long-blend')
    expect(suggestion.reasons).toContain('Camelot-compatible key')
  })

  it('penalizes a recently played candidate and exposes warnings', () => {
    const now = 1_000_000
    const suggestion = scoreTrackCandidate(
      track(),
      track({ id: 'candidate', bpm: 146, camelotKey: '2B', rmsDb: null, analysisConfidence: 0.35, lastLoadedAt: now - 60_000 }),
      now,
    )
    expect(suggestion.score).toBeLessThan(45)
    expect(suggestion.transition).toBe('hard-cut')
    expect(suggestion.warnings).toContain('Recently played')
    expect(suggestion.warnings).toContain('Low analysis confidence')
  })

  it('ranks the strongest candidate first and excludes the reference track', () => {
    const reference = track()
    const ranked = rankTrackCandidates(reference, [
      reference,
      track({ id: 'weak', bpm: 150, camelotKey: '2B', genre: 'drum and bass' }),
      track({ id: 'strong', bpm: 123, camelotKey: '8B', genre: 'deep house' }),
    ])
    expect(ranked.map((item) => item.trackId)).toEqual(['strong', 'weak'])
  })
})
