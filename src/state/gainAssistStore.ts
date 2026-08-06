import { create } from 'zustand'
import type { GainAnalysisResult } from '../audio/mastering'
import type { TrackProfile } from '../storage/trackProfiles'
import type { DeckId } from './mixerStore'

type DeckGainAssistState = {
  enabled: boolean
  analysis: GainAnalysisResult | null
}

type GainAssistStore = {
  decks: Record<DeckId, DeckGainAssistState>
  setEnabled: (deckId: DeckId, enabled: boolean) => void
  setAnalysis: (deckId: DeckId, analysis: GainAnalysisResult | null) => void
  restoreProfile: (deckId: DeckId, profile: TrackProfile) => void
  resetDeckAnalysis: (deckId: DeckId) => void
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
  restoreProfile: (deckId, profile) => set((state) => {
    const recommendedTrimDb = profile.gainRecommendationDb
    const analysis = Number.isFinite(recommendedTrimDb)
      ? {
          recommendedTrimDb: recommendedTrimDb!,
          rmsDb: profile.gainRmsDb ?? 0,
          peakDb: profile.gainPeakDb ?? 0,
          confidence: profile.gainConfidence ?? 0,
        }
      : null
    return { decks: { ...state.decks, [deckId]: { ...state.decks[deckId], analysis } } }
  }),
  resetDeckAnalysis: (deckId) => set((state) => ({
    decks: { ...state.decks, [deckId]: { ...state.decks[deckId], analysis: null } },
  })),
  reset: () => set({ decks: initialState() }),
}))
