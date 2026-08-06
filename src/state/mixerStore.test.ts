import { beforeEach, describe, expect, it } from 'vitest'
import type { TrackProfile } from '../storage/trackProfiles'
import { useMixerStore } from './mixerStore'

describe('mixer store', () => {
  beforeEach(() => useMixerStore.getState().reset())

  it('loads a new track while preserving mixer controls but resetting track analysis', () => {
    useMixerStore.getState().setDeckTrim('A', 6)
    useMixerStore.getState().setDeckVolume('A', 0.42)
    useMixerStore.getState().setDeckBpm('A', 124)
    useMixerStore.getState().setDeckKey('A', 'A minor', '8A')
    useMixerStore.getState().setDeckBeatOffset('A', 0.17)
    useMixerStore.getState().setDeckBarOffset('A', 2)
    useMixerStore.getState().setDeckPitch('A', 3.5)
    useMixerStore.getState().setDeckCue('A', true)
    useMixerStore.getState().setDeckFilter('A', -0.5)
    useMixerStore.getState().setDeckEcho('A', { echoEnabled: true, echoMix: 0.5 })
    useMixerStore.getState().loadTrack('A', 'track-a.mp3')

    const deck = useMixerStore.getState().decks.A
    expect(deck.trackName).toBe('track-a.mp3')
    expect(deck.trackId).toBeNull()
    expect(deck.trim).toBe(6)
    expect(deck.volume).toBe(0.42)
    expect(deck.bpm).toBe(0)
    expect(deck.bpmAnalysisStatus).toBe('idle')
    expect(deck.key).toBe('')
    expect(deck.camelotKey).toBe('')
    expect(deck.keyAnalysisStatus).toBe('idle')
    expect(deck.beatOffsetSeconds).toBe(0)
    expect(deck.barOffsetBeats).toBe(0)
    expect(deck.cuePoint).toBeNull()
    expect(deck.hotCues).toEqual([null, null, null, null, null, null])
    expect(deck.loopBeats).toBe(4)
    expect(deck.pitchPercent).toBe(3.5)
    expect(deck.cueEnabled).toBe(true)
    expect(deck.filter).toBe(-0.5)
    expect(deck.echoEnabled).toBe(true)
    expect(deck.echoMix).toBe(0.5)
    expect(deck.currentTime).toBe(0)
  })

  it('stores automatic BPM and key results with manual overrides', () => {
    useMixerStore.getState().setDeckBpmAnalysis('A', 'analyzing', 0, 0)
    useMixerStore.getState().setDeckBpmAnalysis('A', 'detected', 128.2, 0.81)
    useMixerStore.getState().setDeckKeyAnalysis('A', 'detected', 'A minor', '8A', 0.72)

    expect(useMixerStore.getState().decks.A.bpm).toBe(128.2)
    expect(useMixerStore.getState().decks.A.bpmConfidence).toBe(0.81)
    expect(useMixerStore.getState().decks.A.bpmAnalysisStatus).toBe('detected')
    expect(useMixerStore.getState().decks.A.key).toBe('A minor')
    expect(useMixerStore.getState().decks.A.camelotKey).toBe('8A')
    expect(useMixerStore.getState().decks.A.keyConfidence).toBe(0.72)
    expect(useMixerStore.getState().decks.A.keyAnalysisStatus).toBe('detected')

    useMixerStore.getState().setDeckBpm('A', 129)
    useMixerStore.getState().setDeckKey('A', 'C major', '8B')
    expect(useMixerStore.getState().decks.A.bpm).toBe(129)
    expect(useMixerStore.getState().decks.A.bpmConfidence).toBe(0)
    expect(useMixerStore.getState().decks.A.bpmAnalysisStatus).toBe('manual')
    expect(useMixerStore.getState().decks.A.key).toBe('C major')
    expect(useMixerStore.getState().decks.A.camelotKey).toBe('8B')
    expect(useMixerStore.getState().decks.A.keyConfidence).toBe(0)
    expect(useMixerStore.getState().decks.A.keyAnalysisStatus).toBe('manual')
  })

  it('keeps deck, tempo, key, beat-grid and FX state independent', () => {
    useMixerStore.getState().loadTrack('A', 'a.wav')
    useMixerStore.getState().setPlaying('A', true)
    useMixerStore.getState().setDeckBpm('A', 120)
    useMixerStore.getState().setDeckKey('A', 'A minor', '8A')
    useMixerStore.getState().setDeckBeatOffset('A', 0.12)
    useMixerStore.getState().setDeckBarOffset('A', 3)
    useMixerStore.getState().setDeckPitch('A', 4)
    useMixerStore.getState().setDeckCue('B', true)
    useMixerStore.getState().setDeckReverb('B', { reverbEnabled: true, reverbMix: 0.4 })

    expect(useMixerStore.getState().decks.A.isPlaying).toBe(true)
    expect(useMixerStore.getState().decks.B.isPlaying).toBe(false)
    expect(useMixerStore.getState().decks.A.bpm).toBe(120)
    expect(useMixerStore.getState().decks.B.bpm).toBe(0)
    expect(useMixerStore.getState().decks.A.camelotKey).toBe('8A')
    expect(useMixerStore.getState().decks.B.camelotKey).toBe('')
    expect(useMixerStore.getState().decks.A.beatOffsetSeconds).toBe(0.12)
    expect(useMixerStore.getState().decks.B.beatOffsetSeconds).toBe(0)
    expect(useMixerStore.getState().decks.A.barOffsetBeats).toBe(3)
    expect(useMixerStore.getState().decks.B.barOffsetBeats).toBe(0)
    expect(useMixerStore.getState().decks.A.pitchPercent).toBe(4)
    expect(useMixerStore.getState().decks.B.pitchPercent).toBe(0)
    expect(useMixerStore.getState().decks.A.cueEnabled).toBe(false)
    expect(useMixerStore.getState().decks.B.cueEnabled).toBe(true)
    expect(useMixerStore.getState().decks.A.reverbEnabled).toBe(false)
    expect(useMixerStore.getState().decks.B.reverbEnabled).toBe(true)
  })

  it('restores a cached profile without overwriting mixer controls', () => {
    const profile: TrackProfile = {
      id: 'track-1',
      fileName: 'cached.wav',
      fileSize: 100,
      lastModified: 20,
      bpm: 126,
      bpmConfidence: 0.91,
      bpmAnalysisStatus: 'detected',
      key: 'D minor',
      camelotKey: '7A',
      keyConfidence: 0.74,
      keyAnalysisStatus: 'detected',
      beatOffsetSeconds: 0.08,
      barOffsetBeats: 2,
      waveform: [0.2, 0.7],
      cuePoint: 4,
      hotCues: [4, 8, null, null, null, null],
      loopBeats: 8,
      updatedAt: 30,
    }
    useMixerStore.getState().loadTrack('A', profile.fileName)
    useMixerStore.getState().setDeckVolume('A', 0.33)
    useMixerStore.getState().setDeckIdentity('A', profile.id, profile.fileSize, profile.lastModified)
    useMixerStore.getState().restoreDeckProfile('A', profile)

    const deck = useMixerStore.getState().decks.A
    expect(deck.trackId).toBe('track-1')
    expect(deck.volume).toBe(0.33)
    expect(deck.bpm).toBe(126)
    expect(deck.key).toBe('D minor')
    expect(deck.camelotKey).toBe('7A')
    expect(deck.waveform).toEqual([0.2, 0.7])
    expect(deck.cuePoint).toBe(4)
    expect(deck.hotCues).toEqual([4, 8, null, null, null, null])
    expect(deck.loopBeats).toBe(8)
    expect(useMixerStore.getState().trackHistory[0]).toMatchObject({ id: 'track-1', name: 'cached.wav' })
  })

  it('updates persistent cue slots independently', () => {
    useMixerStore.getState().setDeckCuePoint('A', 6.5)
    useMixerStore.getState().setDeckHotCue('A', 2, 12)
    useMixerStore.getState().setDeckHotCue('B', 2, 18)
    useMixerStore.getState().setDeckLoopBeats('B', 16)

    expect(useMixerStore.getState().decks.A.cuePoint).toBe(6.5)
    expect(useMixerStore.getState().decks.A.hotCues[2]).toBe(12)
    expect(useMixerStore.getState().decks.B.hotCues[2]).toBe(18)
    expect(useMixerStore.getState().decks.B.loopBeats).toBe(16)
  })

  it('updates EQ and playback position', () => {
    useMixerStore.getState().setDeckEq('B', 'low', -12)
    useMixerStore.getState().setDeckTime('B', 15, 180)
    const deck = useMixerStore.getState().decks.B
    expect(deck.low).toBe(-12)
    expect(deck.currentTime).toBe(15)
    expect(deck.duration).toBe(180)
  })

  it('stores master and monitor controls with independent outputs', () => {
    useMixerStore.getState().setMasterVolume(0.65)
    useMixerStore.getState().setCueVolume(0.35)
    useMixerStore.getState().setCueMix(0.75)
    useMixerStore.getState().setMasterOutputId('speakers')
    useMixerStore.getState().setCueOutputId('headphones')
    const state = useMixerStore.getState()
    expect(state.masterVolume).toBe(0.65)
    expect(state.cueVolume).toBe(0.35)
    expect(state.cueMix).toBe(0.75)
    expect(state.masterOutputId).toBe('speakers')
    expect(state.cueOutputId).toBe('headphones')
  })

  it('restores versioned session settings without touching outputs', () => {
    useMixerStore.getState().setMasterOutputId('speakers')
    useMixerStore.getState().restoreSession({
      version: 1,
      crossfader: -0.4,
      masterDeck: 'A',
      quantizeEnabled: false,
      masterVolume: 0.7,
      cueVolume: 0.4,
      cueMix: 0.6,
      trackHistory: [],
    })

    const state = useMixerStore.getState()
    expect(state.crossfader).toBe(-0.4)
    expect(state.masterDeck).toBe('A')
    expect(state.quantizeEnabled).toBe(false)
    expect(state.masterVolume).toBe(0.7)
    expect(state.masterOutputId).toBe('speakers')
  })
})
