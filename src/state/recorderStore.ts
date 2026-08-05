import { create } from 'zustand'

export type RecorderStatus = 'idle' | 'recording' | 'paused' | 'ready' | 'error'

type RecorderState = {
  status: RecorderStatus
  elapsedSeconds: number
  downloadUrl: string | null
  fileName: string | null
  error: string | null
  setStatus: (status: RecorderStatus) => void
  setElapsedSeconds: (seconds: number) => void
  setRecordingResult: (downloadUrl: string, fileName: string) => void
  setError: (message: string) => void
  reset: () => void
}

const initialState = {
  status: 'idle' as RecorderStatus,
  elapsedSeconds: 0,
  downloadUrl: null as string | null,
  fileName: null as string | null,
  error: null as string | null,
}

export const useRecorderStore = create<RecorderState>((set) => ({
  ...initialState,
  setStatus: (status) => set({ status, error: null }),
  setElapsedSeconds: (elapsedSeconds) => set({ elapsedSeconds }),
  setRecordingResult: (downloadUrl, fileName) => set({ status: 'ready', downloadUrl, fileName, error: null }),
  setError: (error) => set({ status: 'error', error }),
  reset: () => set(initialState),
}))
