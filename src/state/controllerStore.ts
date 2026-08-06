import { create } from 'zustand'
import type { ControllerCommand } from '../controllers/controllerCommands'

export type MidiConnectionStatus = 'idle' | 'requesting' | 'ready' | 'unsupported' | 'denied'

type ControllerStore = {
  midiStatus: MidiConnectionStatus
  inputNames: string[]
  mappings: Partial<Record<ControllerCommand, string>>
  learningCommand: ControllerCommand | null
  setMidiStatus: (status: MidiConnectionStatus) => void
  setInputNames: (names: string[]) => void
  startLearning: (command: ControllerCommand | null) => void
  mapControl: (command: ControllerCommand, signature: string) => void
  clearMapping: (command: ControllerCommand) => void
  restoreMappings: (mappings: Partial<Record<ControllerCommand, string>>) => void
  reset: () => void
}

const initialState = {
  midiStatus: 'idle' as MidiConnectionStatus,
  inputNames: [] as string[],
  mappings: {} as Partial<Record<ControllerCommand, string>>,
  learningCommand: null as ControllerCommand | null,
}

export const useControllerStore = create<ControllerStore>((set) => ({
  ...initialState,
  setMidiStatus: (midiStatus) => set({ midiStatus }),
  setInputNames: (inputNames) => set({ inputNames }),
  startLearning: (learningCommand) => set({ learningCommand }),
  mapControl: (command, signature) => set((state) => ({
    mappings: { ...state.mappings, [command]: signature },
    learningCommand: null,
  })),
  clearMapping: (command) => set((state) => {
    const mappings = { ...state.mappings }
    delete mappings[command]
    return { mappings }
  }),
  restoreMappings: (mappings) => set({ mappings }),
  reset: () => set(initialState),
}))
