import { beforeEach, describe, expect, it } from 'vitest'
import { useMixerStore } from './mixerStore'

describe('mixer store', () => {
  beforeEach(() => useMixerStore.getState().reset())

  it('loads a track without changing the saved channel level', () => {
    useMixerStore.getState().setDeckVolume('A', 0.42)
    useMixerStore.getState().loadTrack('A', 'track-a.mp3')

    const deck = useMixerStore.getState().decks.A
    expect(deck.trackName).toBe('track-a.mp3')
    expect(deck.volume).toBe(0.42)
    expect(deck.currentTime).toBe(0)
  })

  it('keeps deck state independent', () => {
    useMixerStore.getState().loadTrack('A', 'a.wav')
    useMixerStore.getState().setPlaying('A', true)

    expect(useMixerStore.getState().decks.A.isPlaying).toBe(true)
    expect(useMixerStore.getState().decks.B.isPlaying).toBe(false)
  })

  it('updates EQ and playback position', () => {
    useMixerStore.getState().setDeckEq('B', 'low', -12)
    useMixerStore.getState().setDeckTime('B', 15, 180)

    const deck = useMixerStore.getState().decks.B
    expect(deck.low).toBe(-12)
    expect(deck.currentTime).toBe(15)
    expect(deck.duration).toBe(180)
  })
})
