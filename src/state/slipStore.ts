import { create } from 'zustand'
import type { DeckId } from './mixerStore'

type SlipState = {
  enabled: Record<DeckId, boolean>
  active: Record<DeckId, boolean>
  setEnabled: (deckId: DeckId, enabled: boolean) => void
  setActive: (deckId: DeckId, active: boolean) => void
  resetDeck: (deckId: DeckId) => void
  reset: () => void
}

const initialFlags = (): Record<DeckId, boolean> => ({ A: false, B: false })

export const useSlipStore = create<SlipState>((set) => ({
  enabled: initialFlags(),
  active: initialFlags(),
  setEnabled: (deckId, enabled) => set((state) => ({
    enabled: { ...state.enabled, [deckId]: enabled },
  })),
  setActive: (deckId, active) => set((state) => ({
    active: { ...state.active, [deckId]: active },
  })),
  resetDeck: (deckId) => set((state) => ({
    active: { ...state.active, [deckId]: false },
  })),
  reset: () => set({ enabled: initialFlags(), active: initialFlags() }),
}))
