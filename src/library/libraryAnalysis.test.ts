import { describe, expect, it } from 'vitest'
import type { TrackAnalysisResult } from '../audio/trackAnalysis'
import type { LibraryTrack } from '../state/libraryStore'
import type { TrackProfile } from '../storage/trackProfiles'
import { isTrackProfileAnalysisComplete, isTrackProfileAutoDjUsable, mergeLibraryAnalysisProfile } from './libraryAnalysis'

const track = (): LibraryTrack => ({
  id: 'track-1',
  file: new File(['audio'], 'Artist - Track.wav', { type: 'audio/wav', lastModified: 42 }),
  fileName: 'Artist - Track.wav',
  size: 5,
  type: 'audio/wav',
  addedAt: 1,
  source: 'local',
  sourceTrackId: null,
  artworkUrl: '',
  permalink: '',
  durationSeconds: 0,
  title: 'Track',
  artist: 'Artist',
  album: '',
  genre: 'house',
})

const analysis = (): TrackAnalysisResult => ({
  durationSeconds: 245.5,
  waveform: [0.1, 0.4, 0.7],
  bpm: { bpm: 124, confidence: 0.84 },
  key: { root: 9, mode: 'minor', key: 'A minor', shortKey: 'Am', camelot: '8A', confidence: 0.73, score: 0.91 },
  gain: { rmsDb: -14.2, peakDb: -1.4, recommendedTrimDb: -1.8, confidence: 0.88 },
})

const existingProfile = (): TrackProfile => ({
  id: 'track-1',
  fileName: 'Artist - Track.wav',
  fileSize: 5,
  lastModified: 42,
  bpm: 128,
  bpmConfidence: 1,
  bpmAnalysisStatus: 'manual',
  key: 'C major',
  camelotKey: '8B',
  keyConfidence: 1,
  keyAnalysisStatus: 'manual',
  gainAnalysisStatus: 'idle',
  beatOffsetSeconds: 0.23,
  barOffsetBeats: 3,
  waveform: [],
  cuePoint: 12,
  hotCues: [12, 24, null, null, null, null],
  loopBeats: 8,
  updatedAt: 1,
})

describe('library background analysis profiles', () => {
  it('builds a complete cached profile from a fresh analysis', () => {
    const profile = mergeLibraryAnalysisProfile(track(), analysis(), null)

    expect(profile).toMatchObject({
      durationSeconds: 245.5,
      bpm: 124,
      bpmAnalysisStatus: 'detected',
      camelotKey: '8A',
      keyAnalysisStatus: 'detected',
      gainRmsDb: -14.2,
      gainAnalysisStatus: 'detected',
      cuePoint: null,
      loopBeats: 4,
    })
    expect(profile.waveform).toEqual([0.1, 0.4, 0.7])
    expect(isTrackProfileAnalysisComplete(profile)).toBe(true)
    expect(isTrackProfileAutoDjUsable(profile)).toBe(true)
  })

  it('preserves manual BPM key grid and cue work while filling missing analysis', () => {
    const profile = mergeLibraryAnalysisProfile(track(), analysis(), existingProfile())

    expect(profile).toMatchObject({
      bpm: 128,
      bpmAnalysisStatus: 'manual',
      key: 'C major',
      camelotKey: '8B',
      keyAnalysisStatus: 'manual',
      gainRmsDb: -14.2,
      gainAnalysisStatus: 'detected',
      beatOffsetSeconds: 0.23,
      barOffsetBeats: 3,
      cuePoint: 12,
      loopBeats: 8,
    })
    expect(profile.hotCues).toEqual([12, 24, null, null, null, null])
    expect(profile.waveform).toEqual([0.1, 0.4, 0.7])
  })

  it('treats completed failed detection differently from an AutoDJ-usable profile', () => {
    const profile = mergeLibraryAnalysisProfile(track(), { ...analysis(), bpm: null, key: null }, null)

    expect(profile.bpmAnalysisStatus).toBe('failed')
    expect(profile.keyAnalysisStatus).toBe('failed')
    expect(isTrackProfileAnalysisComplete(profile)).toBe(true)
    expect(isTrackProfileAutoDjUsable(profile)).toBe(false)
  })
})
