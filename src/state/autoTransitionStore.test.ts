import { beforeEach, describe, expect, it } from 'vitest'
import { useAutoTransitionStore } from './autoTransitionStore'

const plan = {
  trackId: 'candidate',
  trackTitle: 'Candidate',
  outgoingDeck: 'A' as const,
  targetDeck: 'B' as const,
  strategy: 'echo-out' as const,
  profileId: 'smooth' as const,
  beats: 16,
  score: 78,
}

describe('Auto Transition store', () => {
  beforeEach(() => useAutoTransitionStore.getState().reset())

  it('moves through prepare, ready, running and complete states', () => {
    const store = useAutoTransitionStore.getState()
    store.prepare(plan)
    expect(useAutoTransitionStore.getState()).toMatchObject({ status: 'preparing', plan, progress: 0 })
    useAutoTransitionStore.getState().markReady()
    expect(useAutoTransitionStore.getState().status).toBe('ready')
    useAutoTransitionStore.getState().start()
    useAutoTransitionStore.getState().setProgress(0.45)
    expect(useAutoTransitionStore.getState()).toMatchObject({ status: 'running', progress: 0.45 })
    useAutoTransitionStore.getState().complete()
    expect(useAutoTransitionStore.getState()).toMatchObject({ status: 'completed', progress: 1 })
  })

  it('clamps progress and resets errors with a new plan', () => {
    const store = useAutoTransitionStore.getState()
    store.prepare(plan)
    useAutoTransitionStore.getState().fail('No BPM')
    expect(useAutoTransitionStore.getState()).toMatchObject({ status: 'error', error: 'No BPM' })
    useAutoTransitionStore.getState().prepare(plan)
    useAutoTransitionStore.getState().setProgress(4)
    expect(useAutoTransitionStore.getState()).toMatchObject({ status: 'preparing', error: null, progress: 1 })
  })
})
