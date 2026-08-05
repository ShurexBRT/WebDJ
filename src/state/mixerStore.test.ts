import { beforeEach, describe, expect, it } from 'vitest'
import { useMixerStore } from './mixerStore'

describe('mixer store', () => {
  beforeEach(() => useMixerStore.getState().reset())

  it('loads a new track while preserving mixer controls but resetting track analysis', () => {
    useMixerStore.getState().setDeckTrim('A', 6)
    useMixerStore.getState().setDeckVolume('A', 0.42)
    useMixerStore.getState().setDeckBpm('A', 124)
    useMixerStore.getState().setDeckPitch('A', 3.5)
    useMixerStore.getState().setDeckCue('A', true)
    useMixerStore.getState().setDeckFilter('A', -0.5)
    useMixerStore.getState().setDeckEcho('A', { echoEnabled: true, echoMix: 0.5 })
    useMixerStore.getState().loadTrack('A', 'track-a.mp3')

    const deck = useMixerStore.getState().decks.A
    expect(deck.trackName).toBe('track-a.mp3')
    expect(deck.trim).toBe(6)
    expect(deck.volume).toBe(0.42)
    expect(deck.bpm).toBe(0)
    expect(deck.bpmAnalysisStatus).toBe('idle')
    expect(deck.pitchPercent).toBe(3.5)
    expect(deck.cueEnabled).toBe(true)
    expect(deck.filter).toBe(-0.5)
    expect(deck.echoEnabled).toBe(true)
    expect(deck.echoMix).toBe(0.5)
    expect(deck.currentTime).toBe(0)
  })

  it('stores automatic BPM results with confidence and allows manual override', () => {
    useMixerStore.getState().setDeckBpmAnalysis('A', 'analyzing', 0, 0)
    useMixerStore.getState().setDeckBpmAnalysis('A', 'detected', 128.2, 0.81)

    expect(useMixerStore.getState().decks.A.bpm).toBe(128.2)
    expect(useMixerStore.getState().decks.A.bpmConfidence).toBe(0.81)
    expect(useMixerStore.getState().decks.A.bpmAnalysisStatus).toBe('detected')

    useMixerStore.getState().setDeckBpm('A', 129)
    expect(useMixerStore.getState().decks.A.bpm).toBe(129)
    expect(useMixerStore.getState().decks.A.bpmConfidence).toBe(0)
    expect(useMixerStore.getState().decks.A.bpmAnalysisStatus).toBe('manual')
  })

  it('keeps deck, tempo and FX state independent', () => {
    useMixerStore.getState().loadTrack('A', 'a.wav')
    useMixerStore.getState().setPlaying('A', true)
    useMixerStore.getState().setDeckBpm('A', 120)
    useMixerStore.getState().setDeckPitch('A', 4)
    useMixerStore.getState().setDeckCue('B', true)
    useMixerStore.getState().setDeckReverb('B', { reverbEnabled: true, reverbMix: 0.4 })

    expect(useMixerStore.getState().decks.A.isPlaying).toBe(true)
    expect(useMixerStore.getState().decks.B.isPlaying).toBe(false)
    expect(useMixerStore.getState().decks.A.bpm).toBe(120)
    expect(useMixerStore.getState().decks.B.bpm).toBe(0)
    expect(useMixerStore.getState().decks.A.pitchPercent).toBe(4)
    expect(useMixerStore.getState().decks.B.pitchPercent).toBe(0)
    expect(useMixerStore.getState().decks.A.cueEnabled).toBe(false)
    expect(useMixerStore.getState().decks.B.cueEnabled).toBe(true)
    expect(useMixerStore.getState().decks.A.reverbEnabled).toBe(false)
    expect(useMixerStore.getState().decks.B.reverbEnabled).toBe(true)
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
})
