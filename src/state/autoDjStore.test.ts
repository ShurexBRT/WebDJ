import { beforeEach, describe, expect, it } from 'vitest'
import { useAutoDjStore } from './autoDjStore'

describe('Full AutoDJ store', () => {
  beforeEach(() => useAutoDjStore.getState().reset())

  it('arms, tracks the next selection and counts completed transitions', () => {
    useAutoDjStore.getState().enable()
    expect(useAutoDjStore.getState()).toMatchObject({ enabled: true, status: 'armed' })
    useAutoDjStore.getState().setNextTrack('next', 'Next Track', 82)
    useAutoDjStore.getState().setStatus('preparing')
    expect(useAutoDjStore.getState()).toMatchObject({ nextTrackId: 'next', nextTrackTitle: 'Next Track', nextScore: 82, status: 'preparing' })
    useAutoDjStore.getState().completeTransition()
    expect(useAutoDjStore.getState()).toMatchObject({ enabled: true, status: 'armed', completedTransitions: 1, nextTrackId: null })
  })

  it('clamps the quality threshold and preserves it through takeover', () => {
    useAutoDjStore.getState().setMinimumScore(120)
    expect(useAutoDjStore.getState().minimumScore).toBe(100)
    useAutoDjStore.getState().enable()
    useAutoDjStore.getState().disable()
    expect(useAutoDjStore.getState()).toMatchObject({ enabled: false, status: 'off', minimumScore: 100 })
  })

  it('holds a failure until the user takes over or resets', () => {
    useAutoDjStore.getState().enable()
    useAutoDjStore.getState().fail('Not enough tracks')
    useAutoDjStore.getState().setStatus('error')
    expect(useAutoDjStore.getState()).toMatchObject({ enabled: true, status: 'error', error: 'Not enough tracks' })
  })
})
