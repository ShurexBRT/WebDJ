import { beforeEach, describe, expect, it } from 'vitest'
import { useMixerStore } from './mixerStore'

describe('manual BPM priority', () => {
  beforeEach(() => useMixerStore.getState().reset())

  it('ignores a late automatic result after the user enters a manual BPM', () => {
    const store = useMixerStore.getState()
    store.setDeckBpmAnalysis('A', 'analyzing', 0, 0)
    store.setDeckBpm('A', 120)
    store.setDeckBpmAnalysis('A', 'detected', 150, 0.92)

    const deck = useMixerStore.getState().decks.A
    expect(deck.bpm).toBe(120)
    expect(deck.bpmConfidence).toBe(0)
    expect(deck.bpmAnalysisStatus).toBe('manual')
  })

  it('still accepts automatic analysis before any manual override exists', () => {
    const store = useMixerStore.getState()
    store.setDeckBpmAnalysis('B', 'analyzing', 0, 0)
    store.setDeckBpmAnalysis('B', 'detected', 128.4, 0.84)

    const deck = useMixerStore.getState().decks.B
    expect(deck.bpm).toBe(128.4)
    expect(deck.bpmConfidence).toBe(0.84)
    expect(deck.bpmAnalysisStatus).toBe('detected')
  })
})