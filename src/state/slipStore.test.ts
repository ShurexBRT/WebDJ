import { beforeEach, describe, expect, it } from 'vitest'
import { useSlipStore } from './slipStore'

describe('slip store', () => {
  beforeEach(() => useSlipStore.getState().reset())

  it('keeps enabled and active state independent per deck', () => {
    useSlipStore.getState().setEnabled('A', true)
    useSlipStore.getState().setActive('A', true)

    expect(useSlipStore.getState().enabled).toEqual({ A: true, B: false })
    expect(useSlipStore.getState().active).toEqual({ A: true, B: false })
  })

  it('resets only transient activity when a deck transport stops', () => {
    useSlipStore.getState().setEnabled('B', true)
    useSlipStore.getState().setActive('B', true)
    useSlipStore.getState().resetDeck('B')

    expect(useSlipStore.getState().enabled.B).toBe(true)
    expect(useSlipStore.getState().active.B).toBe(false)
  })
})
