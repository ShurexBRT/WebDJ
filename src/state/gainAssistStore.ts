import { create } from 'zustand'
import type { GainAnalysisResult } from '../audio/mastering'
import type { DeckId } from './mixerStore'

type DeckGainAssistState = {
  enabled: boolean
  analysis: GainAnalysisResult | null
}

type GainAssistStore = {
  decks: Record<DeckId, DeckGainAssistState>
  setEnabled: (deckId: DeckId, enabled: boolean) => void
  setAnalysis: (deckId: DeckId, analysis: GainAnalysisResult | null) => void
  resetDeck: (deckId: DeckId) => void
  reset: () => void
}

const initialDeck = (): DeckGainAssistState => ({ enabled: false, analysis: null })
const initialState = () => ({ A: initialDeck(), B: initialDeck() } as Record<DeckId, DeckGainAssistState>)

export const useGainAssistStore = create<GainAssistStore>((set) => ({
  decks: initialState(),
  setEnabled: (deckId, enabled) => set((state) => ({
    decks: { ...state.decks, [deckId]: { ...state.decks[deckId], enabled } },
  })),
  setAnalysis: (deckId, analysis) => set((state) => ({
    decks: { ...state.decks, [deckId]: { ...state.decks[deckId], analysis } },
  })),
  resetDeck: (deckId) => set((state) => ({ decks: { ...state.decks, [deckId]: initialDeck() } })),
  reset: () => set({ decks: initialState() }),
}))
