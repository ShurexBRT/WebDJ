import { create } from 'zustand'
import { fingerprintFile } from '../storage/trackProfiles'
import { readTrackMetadata, type TrackMetadata } from '../library/metadata'
import type { DeckId } from './mixerStore'

export type LibraryTrack = TrackMetadata & {
  id: string
  file: File
  fileName: string
  size: number
  type: string
  addedAt: number
}

type DeckLoadRequest = {
  requestId: number
  track: LibraryTrack
}

type LibraryState = {
  tracks: LibraryTrack[]
  isImporting: boolean
  deckRequests: Record<DeckId, DeckLoadRequest | null>
  addFiles: (files: Iterable<File>) => Promise<void>
  removeTrack: (id: string) => void
  clearLibrary: () => void
  requestDeckLoad: (deckId: DeckId, trackId: string) => void
  consumeDeckRequest: (deckId: DeckId, requestId: number) => void
}

const isAudioFile = (file: File) => file.type.startsWith('audio/') || /\.(mp3|wav|flac|m4a|aac|ogg|opus|webm)$/i.test(file.name)

export const useLibraryStore = create<LibraryState>((set, get) => ({
  tracks: [],
  isImporting: false,
  deckRequests: { A: null, B: null },
  addFiles: async (files) => {
    const candidates = Array.from(files).filter(isAudioFile)
    if (candidates.length === 0) return
    set({ isImporting: true })
    try {
      const imported = await Promise.all(candidates.map(async (file) => {
        const [id, metadata] = await Promise.all([fingerprintFile(file), readTrackMetadata(file)])
        return {
          id,
          file,
          fileName: file.name,
          size: file.size,
          type: file.type,
          addedAt: Date.now(),
          ...metadata,
        } satisfies LibraryTrack
      }))
      set((state) => {
        const byId = new Map(state.tracks.map((track) => [track.id, track]))
        imported.forEach((track) => byId.set(track.id, track))
        return { tracks: Array.from(byId.values()), isImporting: false }
      })
    } catch {
      set({ isImporting: false })
    }
  },
  removeTrack: (id) => set((state) => ({ tracks: state.tracks.filter((track) => track.id !== id) })),
  clearLibrary: () => set({ tracks: [], deckRequests: { A: null, B: null } }),
  requestDeckLoad: (deckId, trackId) => {
    const track = get().tracks.find((item) => item.id === trackId)
    if (!track) return
    set((state) => ({
      deckRequests: {
        ...state.deckRequests,
        [deckId]: { requestId: Date.now() + Math.random(), track },
      },
    }))
  },
  consumeDeckRequest: (deckId, requestId) => set((state) => ({
    deckRequests: {
      ...state.deckRequests,
      [deckId]: state.deckRequests[deckId]?.requestId === requestId ? null : state.deckRequests[deckId],
    },
  })),
}))
