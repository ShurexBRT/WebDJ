import { create } from 'zustand'

export type LibraryAnalysisItemStatus = 'queued' | 'analyzing' | 'ready' | 'failed'

export type LibraryAnalysisItem = {
  status: LibraryAnalysisItemStatus
  error: string | null
}

type LibraryAnalysisState = {
  items: Record<string, LibraryAnalysisItem>
  activeTrackId: string | null
  activeTrackTitle: string
  lastUpdatedTrackId: string | null
  revision: number
  enqueue: (trackIds: string[]) => void
  start: (trackId: string, trackTitle: string) => void
  succeed: (trackId: string) => void
  fail: (trackId: string, error: string) => void
  removeMissing: (trackIds: string[]) => void
  retryFailed: () => void
  reset: () => void
}

const initialState = () => ({
  items: {} as Record<string, LibraryAnalysisItem>,
  activeTrackId: null as string | null,
  activeTrackTitle: '',
  lastUpdatedTrackId: null as string | null,
  revision: 0,
})

export const useLibraryAnalysisStore = create<LibraryAnalysisState>((set) => ({
  ...initialState(),
  enqueue: (trackIds) => set((state) => {
    const items = { ...state.items }
    trackIds.forEach((trackId) => {
      if (!items[trackId]) items[trackId] = { status: 'queued', error: null }
    })
    return { items }
  }),
  start: (trackId, activeTrackTitle) => set((state) => ({
    items: { ...state.items, [trackId]: { status: 'analyzing', error: null } },
    activeTrackId: trackId,
    activeTrackTitle,
  })),
  succeed: (trackId) => set((state) => ({
    items: { ...state.items, [trackId]: { status: 'ready', error: null } },
    activeTrackId: state.activeTrackId === trackId ? null : state.activeTrackId,
    activeTrackTitle: state.activeTrackId === trackId ? '' : state.activeTrackTitle,
    lastUpdatedTrackId: trackId,
    revision: state.revision + 1,
  })),
  fail: (trackId, error) => set((state) => ({
    items: { ...state.items, [trackId]: { status: 'failed', error } },
    activeTrackId: state.activeTrackId === trackId ? null : state.activeTrackId,
    activeTrackTitle: state.activeTrackId === trackId ? '' : state.activeTrackTitle,
    lastUpdatedTrackId: trackId,
    revision: state.revision + 1,
  })),
  removeMissing: (trackIds) => set((state) => {
    const keep = new Set(trackIds)
    const items = Object.fromEntries(Object.entries(state.items).filter(([trackId]) => keep.has(trackId)))
    const activeStillExists = state.activeTrackId ? keep.has(state.activeTrackId) : false
    return {
      items,
      activeTrackId: activeStillExists ? state.activeTrackId : null,
      activeTrackTitle: activeStillExists ? state.activeTrackTitle : '',
      lastUpdatedTrackId: state.lastUpdatedTrackId && keep.has(state.lastUpdatedTrackId)
        ? state.lastUpdatedTrackId
        : null,
    }
  }),
  retryFailed: () => set((state) => ({
    items: Object.fromEntries(Object.entries(state.items).map(([trackId, item]) => [
      trackId,
      item.status === 'failed' ? { status: 'queued' as const, error: null } : item,
    ])),
  })),
  reset: () => set(initialState()),
}))
