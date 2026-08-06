import { create } from 'zustand'
import type { EchoBeatDivision } from '../audio/beatFx'
import type { DeckId } from './mixerStore'

export type EchoTimingMode = 'free' | 'sync'

type DeckFxTimingState = {
  mode: EchoTimingMode
  division: EchoBeatDivision
}

type FxTimingStore = {
  decks: Record<DeckId, DeckFxTimingState>
  setMode: (deckId: DeckId, mode: EchoTimingMode) => void
  setDivision: (deckId: DeckId, division: EchoBeatDivision) => void
  reset: () => void
}

const initialDeck = (): DeckFxTimingState => ({ mode: 'sync', division: '1/2' })
const initialState = () => ({ A: initialDeck(), B: initialDeck() } as Record<DeckId, DeckFxTimingState>)

export const useFxTimingStore = create<FxTimingStore>((set) => ({
  decks: initialState(),
  setMode: (deckId, mode) => set((state) => ({
    decks: { ...state.decks, [deckId]: { ...state.decks[deckId], mode } },
  })),
  setDivision: (deckId, division) => set((state) => ({
    decks: { ...state.decks, [deckId]: { ...state.decks[deckId], division } },
  })),
  reset: () => set({ decks: initialState() }),
}))
