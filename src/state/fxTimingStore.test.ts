import { beforeEach, describe, expect, it } from 'vitest'
import { useFxTimingStore } from './fxTimingStore'

describe('FX timing store', () => {
  beforeEach(() => useFxTimingStore.getState().reset())

  it('starts beat-synchronised and keeps decks independent', () => {
    expect(useFxTimingStore.getState().decks.A).toEqual({ mode: 'sync', division: '1/2' })
    useFxTimingStore.getState().setDivision('A', '2')
    useFxTimingStore.getState().setMode('B', 'free')

    expect(useFxTimingStore.getState().decks.A).toEqual({ mode: 'sync', division: '2' })
    expect(useFxTimingStore.getState().decks.B).toEqual({ mode: 'free', division: '1/2' })
  })
})
