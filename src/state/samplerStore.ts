import { create } from 'zustand'
import { getSamplerPlayer, type SamplerMode } from '../audio/sampler'
import { clearSampleBank, deleteSampleSlot, loadSampleBank, saveSampleSlot } from '../storage/sampleBank'

export type SamplerSlotState = {
  slot: number
  name: string | null
  mimeType: string
  mode: SamplerMode
  volume: number
  blob: Blob | null
  isLoaded: boolean
  isActive: boolean
  error: string | null
}

type SamplerState = {
  slots: SamplerSlotState[]
  masterVolume: number
  isHydrating: boolean
  hydrate: () => Promise<void>
  loadSlot: (slot: number, file: File) => Promise<void>
  triggerSlot: (slot: number, delaySeconds?: number) => boolean
  setSlotMode: (slot: number, mode: SamplerMode) => void
  setSlotVolume: (slot: number, volume: number) => void
  setMasterVolume: (volume: number) => void
  clearSlot: (slot: number) => Promise<void>
  clearAll: () => Promise<void>
}

const createSlot = (slot: number): SamplerSlotState => ({
  slot,
  name: null,
  mimeType: '',
  mode: 'one-shot',
  volume: 0.85,
  blob: null,
  isLoaded: false,
  isActive: false,
  error: null,
})

const updateSlot = (slots: SamplerSlotState[], slot: number, patch: Partial<SamplerSlotState>) =>
  slots.map((item) => item.slot === slot ? { ...item, ...patch } : item)

export const useSamplerStore = create<SamplerState>((set, get) => ({
  slots: Array.from({ length: 9 }, (_, slot) => createSlot(slot)),
  masterVolume: 0.8,
  isHydrating: false,
  hydrate: async () => {
    if (get().isHydrating) return
    set({ isHydrating: true })
    try {
      const stored = await loadSampleBank()
      const player = getSamplerPlayer()
      for (const sample of stored) await player.loadSlot(sample.slot, sample.blob)
      set((state) => ({
        slots: state.slots.map((slot) => {
          const sample = stored.find((item) => item.slot === slot.slot)
          return sample ? {
            ...slot,
            name: sample.name,
            mimeType: sample.mimeType,
            mode: sample.mode,
            volume: sample.volume,
            blob: sample.blob,
            isLoaded: true,
            error: null,
          } : slot
        }),
        isHydrating: false,
      }))
    } catch (error) {
      set({ isHydrating: false })
      console.warn('Unable to restore sampler bank', error)
    }
  },
  loadSlot: async (slot, file) => {
    if (slot < 0 || slot >= get().slots.length) return
    set((state) => ({ slots: updateSlot(state.slots, slot, { error: null }) }))
    try {
      const player = getSamplerPlayer()
      await player.loadSlot(slot, file)
      const current = get().slots[slot]
      await saveSampleSlot({
        slot,
        name: file.name.replace(/\.[^.]+$/, ''),
        mimeType: file.type,
        blob: file,
        mode: current.mode,
        volume: current.volume,
        updatedAt: Date.now(),
      })
      set((state) => ({
        slots: updateSlot(state.slots, slot, {
          name: file.name.replace(/\.[^.]+$/, ''),
          mimeType: file.type,
          blob: file,
          isLoaded: true,
          isActive: false,
          error: null,
        }),
      }))
    } catch (error) {
      set((state) => ({ slots: updateSlot(state.slots, slot, { error: error instanceof Error ? error.message : 'Unable to decode sample' }) }))
    }
  },
  triggerSlot: (slot, delaySeconds = 0) => {
    const current = get().slots[slot]
    if (!current?.isLoaded) return false
    const isActive = getSamplerPlayer().trigger(slot, { mode: current.mode, volume: current.volume, delaySeconds })
    set((state) => ({ slots: updateSlot(state.slots, slot, { isActive }) }))
    if (current.mode === 'one-shot' && isActive) {
      window.setTimeout(() => set((state) => ({ slots: updateSlot(state.slots, slot, { isActive: false }) })), 250)
    }
    return isActive
  },
  setSlotMode: (slot, mode) => {
    const current = get().slots[slot]
    if (!current) return
    if (current.isActive) getSamplerPlayer().stop(slot)
    set((state) => ({ slots: updateSlot(state.slots, slot, { mode, isActive: false }) }))
    if (current.blob && current.name) void saveSampleSlot({
      slot,
      name: current.name,
      mimeType: current.mimeType,
      blob: current.blob,
      mode,
      volume: current.volume,
      updatedAt: Date.now(),
    })
  },
  setSlotVolume: (slot, volume) => {
    const current = get().slots[slot]
    if (!current) return
    const safe = Math.min(1, Math.max(0, volume))
    set((state) => ({ slots: updateSlot(state.slots, slot, { volume: safe }) }))
    if (current.blob && current.name) void saveSampleSlot({
      slot,
      name: current.name,
      mimeType: current.mimeType,
      blob: current.blob,
      mode: current.mode,
      volume: safe,
      updatedAt: Date.now(),
    })
  },
  setMasterVolume: (masterVolume) => {
    const safe = Math.min(1, Math.max(0, masterVolume))
    getSamplerPlayer().setMasterVolume(safe)
    set({ masterVolume: safe })
  },
  clearSlot: async (slot) => {
    getSamplerPlayer().clearSlot(slot)
    await deleteSampleSlot(slot)
    set((state) => ({ slots: updateSlot(state.slots, slot, createSlot(slot)) }))
  },
  clearAll: async () => {
    getSamplerPlayer().stopAll()
    await clearSampleBank()
    set({ slots: Array.from({ length: 9 }, (_, slot) => createSlot(slot)) })
  },
}))
