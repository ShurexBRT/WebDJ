import { beforeEach, describe, expect, it } from 'vitest'
import { useMixerStore } from './mixerStore'

describe('mixer store', () => {
  beforeEach(() => useMixerStore.getState().reset())

  it('loads a track without changing saved channel controls or cue state', () => {
    useMixerStore.getState().setDeckTrim('A', 6)
    useMixerStore.getState().setDeckVolume('A', 0.42)
    useMixerStore.getState().setDeckCue('A', true)
    useMixerStore.getState().loadTrack('A', 'track-a.mp3')

    const deck = useMixerStore.getState().decks.A
    expect(deck.trackName).toBe('track-a.mp3')
    expect(deck.trim).toBe(6)
    expect(deck.volume).toBe(0.42)
    expect(deck.cueEnabled).toBe(true)
    expect(deck.currentTime).toBe(0)
  })

  it('keeps deck state independent', () => {
    useMixerStore.getState().loadTrack('A', 'a.wav')
    useMixerStore.getState().setPlaying('A', true)
    useMixerStore.getState().setDeckCue('B', true)

    expect(useMixerStore.getState().decks.A.isPlaying).toBe(true)
    expect(useMixerStore.getState().decks.B.isPlaying).toBe(false)
    expect(useMixerStore.getState().decks.A.cueEnabled).toBe(false)
    expect(useMixerStore.getState().decks.B.cueEnabled).toBe(true)
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
