import { create } from 'zustand'

export type DeckId = 'A' | 'B'

export type DeckState = {
  trackName: string | null
  isPlaying: boolean
  volume: number
  currentTime: number
  duration: number
  low: number
  mid: number
  high: number
  waveform: number[]
  isAnalyzing: boolean
  analysisError: string | null
}

type MixerState = {
  decks: Record<DeckId, DeckState>
  crossfader: number
  loadTrack: (deckId: DeckId, trackName: string) => void
  setPlaying: (deckId: DeckId, isPlaying: boolean) => void
  setDeckVolume: (deckId: DeckId, volume: number) => void
  setDeckTime: (deckId: DeckId, currentTime: number, duration?: number) => void
  setDeckEq: (deckId: DeckId, band: 'low' | 'mid' | 'high', value: number) => void
  setDeckWaveform: (deckId: DeckId, waveform: number[]) => void
  setDeckAnalysis: (deckId: DeckId, isAnalyzing: boolean, error?: string | null) => void
  setCrossfader: (value: number) => void
  reset: () => void
}

const emptyDeck = (): DeckState => ({
  trackName: null,
  isPlaying: false,
  volume: 0.8,
  currentTime: 0,
  duration: 0,
  low: 0,
  mid: 0,
  high: 0,
  waveform: [],
  isAnalyzing: false,
  analysisError: null,
})

const initialState = () => ({
  decks: { A: emptyDeck(), B: emptyDeck() } as Record<DeckId, DeckState>,
  crossfader: 0,
})

export const useMixerStore = create<MixerState>((set) => ({
  ...initialState(),
  loadTrack: (deckId, trackName) => set((state) => ({
    decks: {
      ...state.decks,
      [deckId]: {
        ...emptyDeck(),
        volume: state.decks[deckId].volume,
        trackName,
      },
    },
  })),
  setPlaying: (deckId, isPlaying) => set((state) => ({
    decks: { ...state.decks, [deckId]: { ...state.decks[deckId], isPlaying } },
  })),
  setDeckVolume: (deckId, volume) => set((state) => ({
    decks: { ...state.decks, [deckId]: { ...state.decks[deckId], volume } },
  })),
  setDeckTime: (deckId, currentTime, duration) => set((state) => ({
    decks: {
      ...state.decks,
      [deckId]: {
        ...state.decks[deckId],
        currentTime,
        duration: duration ?? state.decks[deckId].duration,
      },
    },
  })),
  setDeckEq: (deckId, band, value) => set((state) => ({
    decks: { ...state.decks, [deckId]: { ...state.decks[deckId], [band]: value } },
  })),
  setDeckWaveform: (deckId, waveform) => set((state) => ({
    decks: { ...state.decks, [deckId]: { ...state.decks[deckId], waveform } },
  })),
  setDeckAnalysis: (deckId, isAnalyzing, error = null) => set((state) => ({
    decks: {
      ...state.decks,
      [deckId]: { ...state.decks[deckId], isAnalyzing, analysisError: error },
    },
  })),
  setCrossfader: (crossfader) => set({ crossfader }),
  reset: () => set(initialState()),
}))
