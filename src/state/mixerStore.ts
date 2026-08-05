import { create } from 'zustand'

export type DeckId = 'A' | 'B'

type DeckState = {
  trackName: string | null
  isPlaying: boolean
  volume: number
}

type MixerState = {
  decks: Record<DeckId, DeckState>
  crossfader: number
  togglePlay: (deckId: DeckId) => void
  setDeckVolume: (deckId: DeckId, volume: number) => void
  setCrossfader: (value: number) => void
}

const emptyDeck = (): DeckState => ({ trackName: null, isPlaying: false, volume: 0.8 })

export const useMixerStore = create<MixerState>((set) => ({
  decks: { A: emptyDeck(), B: emptyDeck() },
  crossfader: 0,
  togglePlay: (deckId) => set((state) => ({
    decks: {
      ...state.decks,
      [deckId]: { ...state.decks[deckId], isPlaying: !state.decks[deckId].isPlaying },
    },
  })),
  setDeckVolume: (deckId, volume) => set((state) => ({
    decks: {
      ...state.decks,
      [deckId]: { ...state.decks[deckId], volume },
    },
  })),
  setCrossfader: (crossfader) => set({ crossfader }),
}))
