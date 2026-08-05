import { create } from 'zustand'
import type { AudioOutputDevice } from '../audio/routing'

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
  cueEnabled: boolean
}

type MixerState = {
  decks: Record<DeckId, DeckState>
  crossfader: number
  cueVolume: number
  cueMix: number
  outputDevices: AudioOutputDevice[]
  masterOutputId: string
  cueOutputId: string
  outputSelectionSupported: boolean
  loadTrack: (deckId: DeckId, trackName: string) => void
  setPlaying: (deckId: DeckId, isPlaying: boolean) => void
  setDeckVolume: (deckId: DeckId, volume: number) => void
  setDeckTime: (deckId: DeckId, currentTime: number, duration?: number) => void
  setDeckEq: (deckId: DeckId, band: 'low' | 'mid' | 'high', value: number) => void
  setDeckWaveform: (deckId: DeckId, waveform: number[]) => void
  setDeckAnalysis: (deckId: DeckId, isAnalyzing: boolean, error?: string | null) => void
  setDeckCue: (deckId: DeckId, enabled: boolean) => void
  setCrossfader: (value: number) => void
  setCueVolume: (value: number) => void
  setCueMix: (value: number) => void
  setOutputDevices: (devices: AudioOutputDevice[]) => void
  setMasterOutputId: (deviceId: string) => void
  setCueOutputId: (deviceId: string) => void
  setOutputSelectionSupported: (supported: boolean) => void
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
  cueEnabled: false,
})

const initialState = () => ({
  decks: { A: emptyDeck(), B: emptyDeck() } as Record<DeckId, DeckState>,
  crossfader: 0,
  cueVolume: 0.8,
  cueMix: 0,
  outputDevices: [] as AudioOutputDevice[],
  masterOutputId: 'default',
  cueOutputId: 'default',
  outputSelectionSupported: false,
})

export const useMixerStore = create<MixerState>((set) => ({
  ...initialState(),
  loadTrack: (deckId, trackName) => set((state) => ({
    decks: {
      ...state.decks,
      [deckId]: {
        ...emptyDeck(),
        volume: state.decks[deckId].volume,
        cueEnabled: state.decks[deckId].cueEnabled,
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
  setDeckCue: (deckId, cueEnabled) => set((state) => ({
    decks: { ...state.decks, [deckId]: { ...state.decks[deckId], cueEnabled } },
  })),
  setCrossfader: (crossfader) => set({ crossfader }),
  setCueVolume: (cueVolume) => set({ cueVolume }),
  setCueMix: (cueMix) => set({ cueMix }),
  setOutputDevices: (outputDevices) => set({ outputDevices }),
  setMasterOutputId: (masterOutputId) => set({ masterOutputId }),
  setCueOutputId: (cueOutputId) => set({ cueOutputId }),
  setOutputSelectionSupported: (outputSelectionSupported) => set({ outputSelectionSupported }),
  reset: () => set(initialState()),
}))
