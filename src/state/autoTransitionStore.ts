import { create } from 'zustand'
import type { AutoTransitionPlan } from '../ai/transitionPlan'

export type AutoTransitionStatus = 'idle' | 'preparing' | 'ready' | 'running' | 'completed' | 'error'

type AutoTransitionState = {
  status: AutoTransitionStatus
  plan: AutoTransitionPlan | null
  progress: number
  error: string | null
  prepare: (plan: AutoTransitionPlan) => void
  markReady: () => void
  start: () => void
  setProgress: (progress: number) => void
  complete: () => void
  fail: (message: string) => void
  reset: () => void
}

const initialState = () => ({
  status: 'idle' as AutoTransitionStatus,
  plan: null as AutoTransitionPlan | null,
  progress: 0,
  error: null as string | null,
})

export const useAutoTransitionStore = create<AutoTransitionState>((set) => ({
  ...initialState(),
  prepare: (plan) => set({ status: 'preparing', plan, progress: 0, error: null }),
  markReady: () => set((state) => state.plan ? { status: 'ready', error: null } : state),
  start: () => set((state) => state.plan ? { status: 'running', progress: 0, error: null } : state),
  setProgress: (progress) => set({ progress: Math.max(0, Math.min(1, progress)) }),
  complete: () => set({ status: 'completed', progress: 1, error: null }),
  fail: (message) => set({ status: 'error', error: message, progress: 0 }),
  reset: () => set(initialState()),
}))
