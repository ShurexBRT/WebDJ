import { create } from 'zustand'
import type { AudioOutputDevice } from '../audio/routing'

export type DeckId = 'A' | 'B'
export type BpmAnalysisStatus = 'idle' | 'analyzing' | 'detected' | 'manual' | 'failed'

export type DeckState = {
  trackName: string | null
  isPlaying: boolean
  trim: number
  volume: number
  bpm: number
  bpmConfidence: number
  bpmAnalysisStatus: BpmAnalysisStatus
  beatOffsetSeconds: number
  pitchPercent: number
  currentTime: number
  duration: number
  low: number
  mid: number
  high: number
  filter: number
  echoEnabled: boolean
  echoMix: number
  echoTimeMs: number
  echoFeedback: number
  reverbEnabled: boolean
  reverbMix: number
  waveform: number[]
  isAnalyzing: boolean
  analysisError: string | null
  cueEnabled: boolean
}

type MixerState = {
  decks: Record<DeckId, DeckState>
  crossfader: number
  masterVolume: number
  cueVolume: number
  cueMix: number
  outputDevices: AudioOutputDevice[]
  masterOutputId: string
  cueOutputId: string
  outputSelectionSupported: boolean
  loadTrack: (deckId: DeckId, trackName: string) => void
  setPlaying: (deckId: DeckId, isPlaying: boolean) => void
  setDeckTrim: (deckId: DeckId, trim: number) => void
  setDeckVolume: (deckId: DeckId, volume: number) => void
  setDeckBpm: (deckId: DeckId, bpm: number, status?: BpmAnalysisStatus) => void
  setDeckBpmAnalysis: (deckId: DeckId, status: BpmAnalysisStatus, bpm?: number, confidence?: number) => void
  setDeckBeatOffset: (deckId: DeckId, beatOffsetSeconds: number) => void
  setDeckPitch: (deckId: DeckId, pitchPercent: number) => void
  setDeckTime: (deckId: DeckId, currentTime: number, duration?: number) => void
  setDeckEq: (deckId: DeckId, band: 'low' | 'mid' | 'high', value: number) => void
  setDeckFilter: (deckId: DeckId, value: number) => void
  setDeckEcho: (deckId: DeckId, patch: Partial<Pick<DeckState, 'echoEnabled' | 'echoMix' | 'echoTimeMs' | 'echoFeedback'>>) => void
  setDeckReverb: (deckId: DeckId, patch: Partial<Pick<DeckState, 'reverbEnabled' | 'reverbMix'>>) => void
  setDeckWaveform: (deckId: DeckId, waveform: number[]) => void
  setDeckAnalysis: (deckId: DeckId, isAnalyzing: boolean, error?: string | null) => void
  setDeckCue: (deckId: DeckId, enabled: boolean) => void
  setCrossfader: (value: number) => void
  setMasterVolume: (value: number) => void
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
  trim: 0,
  volume: 0.8,
  bpm: 0,
  bpmConfidence: 0,
  bpmAnalysisStatus: 'idle',
  beatOffsetSeconds: 0,
  pitchPercent: 0,
  currentTime: 0,
  duration: 0,
  low: 0,
  mid: 0,
  high: 0,
  filter: 0,
  echoEnabled: false,
  echoMix: 0.3,
  echoTimeMs: 375,
  echoFeedback: 0.35,
  reverbEnabled: false,
  reverbMix: 0.22,
  waveform: [],
  isAnalyzing: false,
  analysisError: null,
  cueEnabled: false,
})

const initialState = () => ({
  decks: { A: emptyDeck(), B: emptyDeck() } as Record<DeckId, DeckState>,
  crossfader: 0,
  masterVolume: 0.9,
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
        trim: state.decks[deckId].trim,
        volume: state.decks[deckId].volume,
        pitchPercent: state.decks[deckId].pitchPercent,
        cueEnabled: state.decks[deckId].cueEnabled,
        filter: state.decks[deckId].filter,
        echoEnabled: state.decks[deckId].echoEnabled,
        echoMix: state.decks[deckId].echoMix,
        echoTimeMs: state.decks[deckId].echoTimeMs,
        echoFeedback: state.decks[deckId].echoFeedback,
        reverbEnabled: state.decks[deckId].reverbEnabled,
        reverbMix: state.decks[deckId].reverbMix,
        trackName,
      },
    },
  })),
  setPlaying: (deckId, isPlaying) => set((state) => ({ decks: { ...state.decks, [deckId]: { ...state.decks[deckId], isPlaying } } })),
  setDeckTrim: (deckId, trim) => set((state) => ({ decks: { ...state.decks, [deckId]: { ...state.decks[deckId], trim } } })),
  setDeckVolume: (deckId, volume) => set((state) => ({ decks: { ...state.decks, [deckId]: { ...state.decks[deckId], volume } } })),
  setDeckBpm: (deckId, bpm, status = 'manual') => set((state) => ({
    decks: { ...state.decks, [deckId]: { ...state.decks[deckId], bpm, bpmConfidence: 0, bpmAnalysisStatus: status } },
  })),
  setDeckBpmAnalysis: (deckId, bpmAnalysisStatus, bpm, bpmConfidence) => set((state) => ({
    decks: {
      ...state.decks,
      [deckId]: {
        ...state.decks[deckId],
        bpm: bpm ?? state.decks[deckId].bpm,
        bpmConfidence: bpmConfidence ?? state.decks[deckId].bpmConfidence,
        bpmAnalysisStatus,
      },
    },
  })),
  setDeckBeatOffset: (deckId, beatOffsetSeconds) => set((state) => ({
    decks: { ...state.decks, [deckId]: { ...state.decks[deckId], beatOffsetSeconds } },
  })),
  setDeckPitch: (deckId, pitchPercent) => set((state) => ({ decks: { ...state.decks, [deckId]: { ...state.decks[deckId], pitchPercent } } })),
  setDeckTime: (deckId, currentTime, duration) => set((state) => ({
    decks: { ...state.decks, [deckId]: { ...state.decks[deckId], currentTime, duration: duration ?? state.decks[deckId].duration } },
  })),
  setDeckEq: (deckId, band, value) => set((state) => ({ decks: { ...state.decks, [deckId]: { ...state.decks[deckId], [band]: value } } })),
  setDeckFilter: (deckId, filter) => set((state) => ({ decks: { ...state.decks, [deckId]: { ...state.decks[deckId], filter } } })),
  setDeckEcho: (deckId, patch) => set((state) => ({ decks: { ...state.decks, [deckId]: { ...state.decks[deckId], ...patch } } })),
  setDeckReverb: (deckId, patch) => set((state) => ({ decks: { ...state.decks, [deckId]: { ...state.decks[deckId], ...patch } } })),
  setDeckWaveform: (deckId, waveform) => set((state) => ({ decks: { ...state.decks, [deckId]: { ...state.decks[deckId], waveform } } })),
  setDeckAnalysis: (deckId, isAnalyzing, error = null) => set((state) => ({
    decks: { ...state.decks, [deckId]: { ...state.decks[deckId], isAnalyzing, analysisError: error } },
  })),
  setDeckCue: (deckId, cueEnabled) => set((state) => ({ decks: { ...state.decks, [deckId]: { ...state.decks[deckId], cueEnabled } } })),
  setCrossfader: (crossfader) => set({ crossfader }),
  setMasterVolume: (masterVolume) => set({ masterVolume }),
  setCueVolume: (cueVolume) => set({ cueVolume }),
  setCueMix: (cueMix) => set({ cueMix }),
  setOutputDevices: (outputDevices) => set({ outputDevices }),
  setMasterOutputId: (masterOutputId) => set({ masterOutputId }),
  setCueOutputId: (cueOutputId) => set({ cueOutputId }),
  setOutputSelectionSupported: (outputSelectionSupported) => set({ outputSelectionSupported }),
  reset: () => set(initialState()),
}))
