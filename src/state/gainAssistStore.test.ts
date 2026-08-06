import { beforeEach, describe, expect, it } from 'vitest'
import { useGainAssistStore } from './gainAssistStore'

describe('gain assist store', () => {
  beforeEach(() => useGainAssistStore.getState().reset())

  it('keeps enabled preferences and analysis independent per deck', () => {
    useGainAssistStore.getState().setEnabled('A', true)
    useGainAssistStore.getState().setAnalysis('A', {
      rmsDb: -20,
      peakDb: -6,
      recommendedTrimDb: 4,
      confidence: 0.8,
    })
    useGainAssistStore.getState().resetDeckAnalysis('A')

    expect(useGainAssistStore.getState().decks.A.enabled).toBe(true)
    expect(useGainAssistStore.getState().decks.A.analysis).toBeNull()
    expect(useGainAssistStore.getState().decks.B.enabled).toBe(false)
  })

  it('restores cached gain analysis from a track profile', () => {
    useGainAssistStore.getState().restoreProfile('B', {
      id: 'track',
      fileName: 'track.wav',
      fileSize: 10,
      lastModified: 1,
      bpm: 120,
      bpmConfidence: 0.7,
      bpmAnalysisStatus: 'detected',
      gainRecommendationDb: -2.5,
      gainRmsDb: -13.5,
      gainPeakDb: -1.2,
      gainConfidence: 0.9,
      beatOffsetSeconds: 0,
      barOffsetBeats: 0,
      waveform: [],
      cuePoint: null,
      hotCues: [],
      loopBeats: 4,
      updatedAt: 1,
    })

    expect(useGainAssistStore.getState().decks.B.analysis).toEqual({
      recommendedTrimDb: -2.5,
      rmsDb: -13.5,
      peakDb: -1.2,
      confidence: 0.9,
    })
  })
})
