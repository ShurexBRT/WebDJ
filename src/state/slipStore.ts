import { create } from 'zustand'
import type { DeckId } from './mixerStore'

type SlipState = {
  enabled: Record<DeckId, boolean>
  setEnabled: (deckId: DeckId, enabled: boolean) => void
  reset: () => void
}

const initialEnabled = (): Record<DeckId, boolean> => ({ A: false, B: false })

export const useSlipStore = create<SlipState>((set) => ({
  enabled: initialEnabled(),
  setEnabled: (deckId, enabled) => set((state) => ({
    enabled: { ...state.enabled, [deckId]: enabled },
  })),
  reset: () => set({ enabled: initialEnabled() }),
}))
