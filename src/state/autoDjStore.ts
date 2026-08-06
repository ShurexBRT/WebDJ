import { create } from 'zustand'

export type AutoDjStatus = 'off' | 'armed' | 'selecting' | 'preparing' | 'ready' | 'transitioning' | 'error'

type AutoDjState = {
  enabled: boolean
  status: AutoDjStatus
  nextTrackId: string | null
  nextTrackTitle: string
  nextScore: number
  completedTransitions: number
  minimumScore: number
  error: string | null
  enable: () => void
  disable: () => void
  setStatus: (status: AutoDjStatus) => void
  setNextTrack: (trackId: string, title: string, score: number) => void
  clearNextTrack: () => void
  completeTransition: () => void
  setMinimumScore: (score: number) => void
  fail: (message: string) => void
  reset: () => void
}

const initialState = () => ({
  enabled: false,
  status: 'off' as AutoDjStatus,
  nextTrackId: null as string | null,
  nextTrackTitle: '',
  nextScore: 0,
  completedTransitions: 0,
  minimumScore: 25,
  error: null as string | null,
})

export const useAutoDjStore = create<AutoDjState>((set) => ({
  ...initialState(),
  enable: () => set({ enabled: true, status: 'armed', error: null }),
  disable: () => set({ enabled: false, status: 'off', nextTrackId: null, nextTrackTitle: '', nextScore: 0, error: null }),
  setStatus: (status) => set({ status, error: status === 'error' ? undefined : null }),
  setNextTrack: (nextTrackId, nextTrackTitle, nextScore) => set({ nextTrackId, nextTrackTitle, nextScore }),
  clearNextTrack: () => set({ nextTrackId: null, nextTrackTitle: '', nextScore: 0 }),
  completeTransition: () => set((state) => ({
    status: 'armed',
    completedTransitions: state.completedTransitions + 1,
    nextTrackId: null,
    nextTrackTitle: '',
    nextScore: 0,
    error: null,
  })),
  setMinimumScore: (minimumScore) => set({ minimumScore: Math.max(0, Math.min(100, minimumScore)) }),
  fail: (error) => set({ status: 'error', error }),
  reset: () => set(initialState()),
}))
