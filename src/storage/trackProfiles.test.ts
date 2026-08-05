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

  it('saves and retrieves a complete analysis profile', async () => {
    await saveTrackProfile(profile('track-one'))
    const restored = await getTrackProfile('track-one')

    expect(restored).toMatchObject({
      id: 'track-one',
      bpm: 124.5,
      beatOffsetSeconds: 0.12,
      barOffsetBeats: 2,
      cuePoint: 4,
      loopBeats: 8,
    })
    expect(restored?.hotCues).toEqual([4, 8, null, null, null, null])
    expect(restored?.updatedAt).toBeGreaterThan(0)
  })
})
