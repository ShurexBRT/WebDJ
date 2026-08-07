import { describe, expect, it } from 'vitest'
import { useMixerStore } from '../state/mixerStore'
import { freeDeckFor, selectAutoDjReferenceDeck, shouldStartPreparedTransition, transitionDurationSeconds } from './autoDj'

const plan = {
  trackId: 'next',
  trackTitle: 'Next',
  outgoingDeck: 'A' as const,
  targetDeck: 'B' as const,
  strategy: 'echo-out' as const,
  profileId: 'quick' as const,
  beats: 8,
  score: 80,
}

describe('AutoDJ decisions', () => {
  it('prefers a playing master and otherwise uses the playing loaded deck', () => {
    const empty = useMixerStore.getState().decks
    const decks = {
      A: { ...empty.A, trackId: 'a', isPlaying: true },
      B: { ...empty.B, trackId: 'b', isPlaying: true },
    }
    expect(selectAutoDjReferenceDeck('B', decks)).toBe('B')
    expect(selectAutoDjReferenceDeck(null, decks)).toBe('A')
    expect(selectAutoDjReferenceDeck('B', { ...decks, B: { ...decks.B, isPlaying: false } })).toBe('A')
  })

  it('starts only when enough track time remains for the planned transition', () => {
    expect(transitionDurationSeconds(plan, 120)).toBe(4)
    expect(shouldStartPreparedTransition(5.4, plan, 120)).toBe(true)
    expect(shouldStartPreparedTransition(5.6, plan, 120)).toBe(false)
    expect(shouldStartPreparedTransition(2, plan, 0)).toBe(false)
  })

  it('always targets the opposite deck', () => {
    expect(freeDeckFor('A')).toBe('B')
    expect(freeDeckFor('B')).toBe('A')
  })
})
