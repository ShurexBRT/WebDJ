import { beforeEach, describe, expect, it } from 'vitest'
import { useKeyStore } from './keyStore'

describe('key store', () => {
  beforeEach(() => useKeyStore.getState().reset())

  it('keeps deck key analysis independent', () => {
    useKeyStore.getState().setAnalysis('A', 'detected', 'A minor', '8A', 0.72)
    useKeyStore.getState().setManual('B', 'C major', '8B')

    expect(useKeyStore.getState().decks.A).toEqual({
      key: 'A minor',
      camelotKey: '8A',
      confidence: 0.72,
      status: 'detected',
    })
    expect(useKeyStore.getState().decks.B).toEqual({
      key: 'C major',
      camelotKey: '8B',
      confidence: 0,
      status: 'manual',
    })
  })

  it('restores old and new track profiles safely', () => {
    useKeyStore.getState().restoreProfile('A', {
      id: 'old',
      fileName: 'old.wav',
      fileSize: 10,
      lastModified: 1,
      bpm: 120,
      bpmConfidence: 0.7,
      bpmAnalysisStatus: 'detected',
      beatOffsetSeconds: 0,
      barOffsetBeats: 0,
      waveform: [],
      cuePoint: null,
      hotCues: [],
      loopBeats: 4,
      updatedAt: 1,
    })
    useKeyStore.getState().restoreProfile('B', {
      id: 'new',
      fileName: 'new.wav',
      fileSize: 20,
      lastModified: 2,
      bpm: 124,
      bpmConfidence: 0.8,
      bpmAnalysisStatus: 'detected',
      key: 'D minor',
      camelotKey: '7A',
      keyConfidence: 0.68,
      keyAnalysisStatus: 'detected',
      beatOffsetSeconds: 0,
      barOffsetBeats: 0,
      waveform: [],
      cuePoint: null,
      hotCues: [],
      loopBeats: 4,
      updatedAt: 2,
    })

    expect(useKeyStore.getState().decks.A.status).toBe('idle')
    expect(useKeyStore.getState().decks.B).toMatchObject({ key: 'D minor', camelotKey: '7A', confidence: 0.68 })
  })
})
