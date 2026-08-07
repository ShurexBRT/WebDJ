import { create } from 'zustand'
import { isAutoDjMixProfileId, type AutoDjMixProfileId } from '../ai/mixProfiles'

export type AutoDjStatus = 'off' | 'armed' | 'analyzing-library' | 'selecting' | 'preparing' | 'ready' | 'transitioning' | 'error'

const PROFILE_STORAGE_KEY = 'webdj-autodj-profile-v1'

function savedProfile(): AutoDjMixProfileId {
  if (typeof localStorage === 'undefined') return 'smooth'
  try {
    const value = localStorage.getItem(PROFILE_STORAGE_KEY)
    return value && isAutoDjMixProfileId(value) ? value : 'smooth'
  } catch {
    return 'smooth'
  }
}

type AutoDjState = {
  enabled: boolean
  status: AutoDjStatus
  nextTrackId: string | null
  nextTrackTitle: string
  nextScore: number
  completedTransitions: number
  minimumScore: number
  mixProfileId: AutoDjMixProfileId
  error: string | null
  enable: () => void
  disable: () => void
  setStatus: (status: AutoDjStatus) => void
  setNextTrack: (trackId: string, title: string, score: number) => void
  clearNextTrack: () => void
  completeTransition: () => void
  setMinimumScore: (score: number) => void
  setMixProfile: (profileId: AutoDjMixProfileId) => void
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
  mixProfileId: savedProfile(),
  error: null as string | null,
})

export const useAutoDjStore = create<AutoDjState>((set) => ({
  ...initialState(),
  enable: () => set({ enabled: true, status: 'armed', error: null }),
  disable: () => set({ enabled: false, status: 'off', nextTrackId: null, nextTrackTitle: '', nextScore: 0, error: null }),
  setStatus: (status) => set((state) => ({ status, error: status === 'error' ? state.error : null })),
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
  setMixProfile: (mixProfileId) => {
    try { localStorage.setItem(PROFILE_STORAGE_KEY, mixProfileId) } catch { /* storage is optional */ }
    set({ mixProfileId })
  },
  fail: (error) => set({ status: 'error', error }),
  reset: () => set(initialState()),
}))
