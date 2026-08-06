import { create } from 'zustand'
import type { AudioOutputDevice } from '../audio/routing'
import type { SessionSettings } from '../storage/sessionSettings'
import type { TrackProfile } from '../storage/trackProfiles'

export type DeckId = 'A' | 'B'
export type BpmAnalysisStatus = 'idle' | 'analyzing' | 'detected' | 'manual' | 'failed'
export type LoopBeats = 1 | 2 | 4 | 8 | 16
export type BeatJumpBeats = 1 | 4 | 8 | 16
export type DeckLoopRange = { start: number; end: number }

export type TrackHistoryItem = {
  id: string
  name: string
  lastLoadedAt: number
}

export type DeckState = {
  trackId: string | null
  trackName: string | null
  fileSize: number
  lastModified: number
  isPlaying: boolean
  trim: number
  volume: number
  bpm: number
  bpmConfidence: number
  bpmAnalysisStatus: BpmAnalysisStatus
  beatOffsetSeconds: number
  barOffsetBeats: number
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
  cuePoint: number | null
  hotCues: Array<number | null>
  loopBeats: LoopBeats
  loopRange: DeckLoopRange | null
  beatJumpBeats: BeatJumpBeats
}

type MixerState = {
  decks: Record<DeckId, DeckState>
  trackHistory: TrackHistoryItem[]
  crossfader: number
  masterDeck: DeckId | null
  quantizeEnabled: boolean
  masterVolume: number
  cueVolume: number
  cueMix: number
  outputDevices: AudioOutputDevice[]
  masterOutputId: string
  cueOutputId: string
  outputSelectionSupported: boolean
  loadTrack: (deckId: DeckId, trackName: string) => void
  setDeckIdentity: (deckId: DeckId, trackId: string, fileSize: number, lastModified: number) => void
  restoreDeckProfile: (deckId: DeckId, profile: TrackProfile) => void
  restoreSession: (settings: SessionSettings) => void
  setPlaying: (deckId: DeckId, isPlaying: boolean) => void
  setDeckTrim: (deckId: DeckId, trim: number) => void
  setDeckVolume: (deckId: DeckId, volume: number) => void
  setDeckBpm: (deckId: DeckId, bpm: number, status?: BpmAnalysisStatus) => void
  setDeckBpmAnalysis: (deckId: DeckId, status: BpmAnalysisStatus, bpm?: number, confidence?: number) => void
  setDeckBeatOffset: (deckId: DeckId, beatOffsetSeconds: number) => void
  setDeckBarOffset: (deckId: DeckId, barOffsetBeats: number) => void
  setDeckPitch: (deckId: DeckId, pitchPercent: number) => void
  setDeckTime: (deckId: DeckId, currentTime: number, duration?: number) => void
  setDeckEq: (deckId: DeckId, band: 'low' | 'mid' | 'high', value: number) => void
  setDeckFilter: (deckId: DeckId, value: number) => void
  setDeckEcho: (deckId: DeckId, patch: Partial<Pick<DeckState, 'echoEnabled' | 'echoMix' | 'echoTimeMs' | 'echoFeedback'>>) => void
  setDeckReverb: (deckId: DeckId, patch: Partial<Pick<DeckState, 'reverbEnabled' | 'reverbMix'>>) => void
  setDeckWaveform: (deckId: DeckId, waveform: number[]) => void
  setDeckAnalysis: (deckId: DeckId, isAnalyzing: boolean, error?: string | null) => void
  setDeckCue: (deckId: DeckId, enabled: boolean) => void
  setDeckCuePoint: (deckId: DeckId, time: number | null) => void
  setDeckHotCue: (deckId: DeckId, index: number, time: number | null) => void
  setDeckLoopBeats: (deckId: DeckId, beats: LoopBeats) => void
  setDeckLoopRange: (deckId: DeckId, range: DeckLoopRange | null) => void
  setDeckBeatJumpBeats: (deckId: DeckId, beats: BeatJumpBeats) => void
  setCrossfader: (value: number) => void
  setMasterDeck: (deckId: DeckId | null) => void
  setQuantizeEnabled: (enabled: boolean) => void
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
  trackId: null,
  trackName: null,
  fileSize: 0,
  lastModified: 0,
  isPlaying: false,
  trim: 0,
  volume: 0.8,
  bpm: 0,
  bpmConfidence: 0,
  bpmAnalysisStatus: 'idle',
  beatOffsetSeconds: 0,
  barOffsetBeats: 0,
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
  cuePoint: null,
  hotCues: Array.from({ length: 6 }, () => null),
  loopBeats: 4,
  loopRange: null,
  beatJumpBeats: 4,
})

const initialState = () => ({
  decks: { A: emptyDeck(), B: emptyDeck() } as Record<DeckId, DeckState>,
  trackHistory: [] as TrackHistoryItem[],
  crossfader: 0,
  masterDeck: null as DeckId | null,
  quantizeEnabled: true,
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
        beatJumpBeats: state.decks[deckId].beatJumpBeats,
        trackName,
      },
    },
  })),
  setDeckIdentity: (deckId, trackId, fileSize, lastModified) => set((state) => {
    const trackName = state.decks[deckId].trackName ?? 'Unknown track'
    const nextHistory = [
      { id: trackId, name: trackName, lastLoadedAt: Date.now() },
      ...state.trackHistory.filter((item) => item.id !== trackId),
    ].slice(0, 50)
    return {
      decks: { ...state.decks, [deckId]: { ...state.decks[deckId], trackId, fileSize, lastModified } },
      trackHistory: nextHistory,
    }
  }),
  restoreDeckProfile: (deckId, profile) => set((state) => ({
    decks: {
      ...state.decks,
      [deckId]: {
        ...state.decks[deckId],
        bpm: profile.bpm,
        bpmConfidence: profile.bpmConfidence,
        bpmAnalysisStatus: profile.bpmAnalysisStatus,
        beatOffsetSeconds: profile.beatOffsetSeconds,
        barOffsetBeats: profile.barOffsetBeats,
        waveform: profile.waveform,
        cuePoint: profile.cuePoint,
        hotCues: [...profile.hotCues, ...Array.from({ length: 6 }, () => null)].slice(0, 6),
        loopBeats: profile.loopBeats,
        isAnalyzing: false,
        analysisError: null,
      },
    },
  })),
  restoreSession: (settings) => set({
    crossfader: settings.crossfader,
    masterDeck: settings.masterDeck,
    quantizeEnabled: settings.quantizeEnabled,
    masterVolume: settings.masterVolume,
    cueVolume: settings.cueVolume,
    cueMix: settings.cueMix,
  }),
  setPlaying: (deckId, isPlaying) => set((state) => ({ decks: { ...state.decks, [deckId]: { ...state.decks[deckId], isPlaying } } })),
  setDeckTrim: (deckId, trim) => set((state) => ({ decks: { ...state.decks, [deckId]: { ...state.decks[deckId], trim } } })),
  setDeckVolume: (deckId, volume) => set((state) => ({ decks: { ...state.decks, [deckId]: { ...state.decks[deckId], volume } } })),
  setDeckBpm: (deckId, bpm, status = 'manual') => set((state) => ({
    decks: { ...state.decks, [deckId]: { ...state.decks[deckId], bpm, bpmConfidence: 0, bpmAnalysisStatus: status } },
  })),
  setDeckBpmAnalysis: (deckId, bpmAnalysisStatus, bpm, bpmConfidence) => set((state) => {
    const currentDeck = state.decks[deckId]
    if (currentDeck.bpmAnalysisStatus === 'manual' && bpmAnalysisStatus !== 'manual') return state
    return {
      decks: {
        ...state.decks,
        [deckId]: {
          ...currentDeck,
          bpm: bpm ?? currentDeck.bpm,
          bpmConfidence: bpmConfidence ?? currentDeck.bpmConfidence,
          bpmAnalysisStatus,
        },
      },
    }
  }),
  setDeckBeatOffset: (deckId, beatOffsetSeconds) => set((state) => ({
    decks: { ...state.decks, [deckId]: { ...state.decks[deckId], beatOffsetSeconds } },
  })),
  setDeckBarOffset: (deckId, barOffsetBeats) => set((state) => ({
    decks: { ...state.decks, [deckId]: { ...state.decks[deckId], barOffsetBeats } },
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
  setDeckCuePoint: (deckId, cuePoint) => set((state) => ({
    decks: { ...state.decks, [deckId]: { ...state.decks[deckId], cuePoint } },
  })),
  setDeckHotCue: (deckId, index, time) => set((state) => {
    if (index < 0 || index >= 6) return state
    const hotCues = state.decks[deckId].hotCues.map((value, itemIndex) => itemIndex === index ? time : value)
    return { decks: { ...state.decks, [deckId]: { ...state.decks[deckId], hotCues } } }
  }),
  setDeckLoopBeats: (deckId, loopBeats) => set((state) => ({
    decks: { ...state.decks, [deckId]: { ...state.decks[deckId], loopBeats } },
  })),
  setDeckLoopRange: (deckId, loopRange) => set((state) => ({
    decks: { ...state.decks, [deckId]: { ...state.decks[deckId], loopRange } },
  })),
  setDeckBeatJumpBeats: (deckId, beatJumpBeats) => set((state) => ({
    decks: { ...state.decks, [deckId]: { ...state.decks[deckId], beatJumpBeats } },
  })),
  setCrossfader: (crossfader) => set({ crossfader }),
  setMasterDeck: (masterDeck) => set({ masterDeck }),
  setQuantizeEnabled: (quantizeEnabled) => set({ quantizeEnabled }),
  setMasterVolume: (masterVolume) => set({ masterVolume }),
  setCueVolume: (cueVolume) => set({ cueVolume }),
  setCueMix: (cueMix) => set({ cueMix }),
  setOutputDevices: (outputDevices) => set({ outputDevices }),
  setMasterOutputId: (masterOutputId) => set({ masterOutputId }),
  setCueOutputId: (cueOutputId) => set({ cueOutputId }),
  setOutputSelectionSupported: (outputSelectionSupported) => set({ outputSelectionSupported }),
  reset: () => set(initialState()),
}))