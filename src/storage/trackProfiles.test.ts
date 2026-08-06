import { beforeEach, describe, expect, it } from 'vitest'
import { clearTrackProfiles, fingerprintFile, getTrackProfile, saveTrackProfile, type TrackProfile } from './trackProfiles'

const profile = (id: string): TrackProfile => ({
  id,
  fileName: 'track.wav',
  fileSize: 12,
  lastModified: 100,
  bpm: 124.5,
  bpmConfidence: 0.83,
  bpmAnalysisStatus: 'detected',
  key: 'A minor',
  camelotKey: '8A',
  keyConfidence: 0.72,
  keyAnalysisStatus: 'detected',
  beatOffsetSeconds: 0.12,
  barOffsetBeats: 2,
  waveform: [0.2, 0.5, 0.8],
  cuePoint: 4,
  hotCues: [4, 8, null, null, null, null],
  loopBeats: 8,
  updatedAt: 0,
})

describe('track profile persistence', () => {
  beforeEach(async () => clearTrackProfiles())

  it('creates content-stable fingerprints and distinguishes changed files', async () => {
    const first = new File(['same audio'], 'track.wav', { type: 'audio/wav', lastModified: 10 })
    const copiedLater = new File(['same audio'], 'track.wav', { type: 'audio/wav', lastModified: 99_999 })
    const changed = new File(['changed audio'], 'track.wav', { type: 'audio/wav', lastModified: 10 })

    expect(await fingerprintFile(first)).toBe(await fingerprintFile(copiedLater))
    expect(await fingerprintFile(first)).not.toBe(await fingerprintFile(changed))
  })

  it('saves and retrieves BPM key cues and loop analysis', async () => {
    await saveTrackProfile(profile('track-one'))
    const restored = await getTrackProfile('track-one')

    expect(restored).toMatchObject({
      id: 'track-one',
      bpm: 124.5,
      key: 'A minor',
      camelotKey: '8A',
      keyConfidence: 0.72,
      keyAnalysisStatus: 'detected',
      beatOffsetSeconds: 0.12,
      barOffsetBeats: 2,
      cuePoint: 4,
      loopBeats: 8,
    })
    expect(restored?.hotCues).toEqual([4, 8, null, null, null, null])
    expect(restored?.updatedAt).toBeGreaterThan(0)
  })

  it('normalizes a profile without key fields', async () => {
    const legacy = profile('legacy')
    delete legacy.key
    delete legacy.camelotKey
    delete legacy.keyConfidence
    delete legacy.keyAnalysisStatus
    await saveTrackProfile(legacy)

    expect(await getTrackProfile('legacy')).toMatchObject({
      key: '',
      camelotKey: '',
      keyConfidence: 0,
      keyAnalysisStatus: 'idle',
    })
  })
})
