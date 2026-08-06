import { create } from 'zustand'
import type { DeckId } from './mixerStore'
import type { PersistedKeyStatus, TrackProfile } from '../storage/trackProfiles'

export type KeyAnalysisStatus = PersistedKeyStatus | 'analyzing'

export type DeckKeyState = {
  key: string
  camelotKey: string
  confidence: number
  status: KeyAnalysisStatus
}

type KeyStore = {
  decks: Record<DeckId, DeckKeyState>
  resetDeck: (deckId: DeckId) => void
  setAnalysis: (deckId: DeckId, status: KeyAnalysisStatus, key?: string, camelotKey?: string, confidence?: number) => void
  setManual: (deckId: DeckId, key: string, camelotKey: string) => void
  restoreProfile: (deckId: DeckId, profile: TrackProfile) => void
  reset: () => void
}

const emptyKey = (): DeckKeyState => ({ key: '', camelotKey: '', confidence: 0, status: 'idle' })
const initialState = () => ({ A: emptyKey(), B: emptyKey() } as Record<DeckId, DeckKeyState>)

export const useKeyStore = create<KeyStore>((set) => ({
  decks: initialState(),
  resetDeck: (deckId) => set((state) => ({ decks: { ...state.decks, [deckId]: emptyKey() } })),
  setAnalysis: (deckId, status, key, camelotKey, confidence) => set((state) => ({
    decks: {
      ...state.decks,
      [deckId]: {
        key: key ?? state.decks[deckId].key,
        camelotKey: camelotKey ?? state.decks[deckId].camelotKey,
        confidence: confidence ?? state.decks[deckId].confidence,
        status,
      },
    },
  })),
  setManual: (deckId, key, camelotKey) => set((state) => ({
    decks: { ...state.decks, [deckId]: { key, camelotKey, confidence: 0, status: 'manual' } },
  })),
  restoreProfile: (deckId, profile) => set((state) => ({
    decks: {
      ...state.decks,
      [deckId]: {
        key: profile.key ?? '',
        camelotKey: profile.camelotKey ?? '',
        confidence: profile.keyConfidence ?? 0,
        status: profile.keyAnalysisStatus ?? 'idle',
      },
    },
  })),
  reset: () => set({ decks: initialState() }),
}))
