import { useCallback, useEffect, useRef } from 'react'
import { useControllerStore } from '../state/controllerStore'
import { CONTROLLER_COMMANDS, executeControllerCommand, type ControllerCommand } from './controllerCommands'

type NavigatorWithMidi = Navigator & {
  requestMIDIAccess?: (options?: MIDIOptions) => Promise<MIDIAccess>
}

const STORAGE_KEY = 'webdj-midi-mappings-v1'
const continuousCommands = new Set<ControllerCommand>(['crossfader', 'volumeA', 'volumeB', 'filterA', 'filterB'])

export function midiMessageSignature(data: Uint8Array): string | null {
  if (data.length < 2) return null
  const status = data[0]
  const command = status & 0xf0
  if (![0x80, 0x90, 0xb0].includes(command)) return null
  return `${status}-${data[1]}`
}

function readStoredMappings(): Partial<Record<ControllerCommand, string>> {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, unknown>
    return Object.fromEntries(
      Object.entries(parsed).filter(([command, signature]) => (
        CONTROLLER_COMMANDS.includes(command as ControllerCommand) && typeof signature === 'string'
      )),
    ) as Partial<Record<ControllerCommand, string>>
  } catch {
    return {}
  }
}

export function useMidiController() {
  const accessRef = useRef<MIDIAccess | null>(null)
  const mappings = useControllerStore((state) => state.mappings)
  const learningCommand = useControllerStore((state) => state.learningCommand)
  const setMidiStatus = useControllerStore((state) => state.setMidiStatus)
  const setInputNames = useControllerStore((state) => state.setInputNames)
  const mapControl = useControllerStore((state) => state.mapControl)
  const restoreMappings = useControllerStore((state) => state.restoreMappings)

  useEffect(() => {
    restoreMappings(readStoredMappings())
  }, [restoreMappings])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings))
  }, [mappings])

  const handleMessage = useCallback((event: MIDIMessageEvent) => {
    const signature = midiMessageSignature(event.data)
    if (!signature) return

    if (learningCommand) {
      mapControl(learningCommand, signature)
      return
    }

    const command = CONTROLLER_COMMANDS.find((candidate) => mappings[candidate] === signature)
    if (!command) return
    const value = event.data[2] ?? 0
    if (!continuousCommands.has(command) && value === 0) return
    void executeControllerCommand(command, value)
  }, [learningCommand, mapControl, mappings])

  const attachInputs = useCallback((access: MIDIAccess) => {
    const inputs = Array.from(access.inputs.values())
    setInputNames(inputs.map((input, index) => input.name?.trim() || `MIDI Input ${index + 1}`))
    inputs.forEach((input) => {
      input.onmidimessage = handleMessage
    })
  }, [handleMessage, setInputNames])

  useEffect(() => {
    if (!accessRef.current) return
    attachInputs(accessRef.current)
  }, [attachInputs])

  const connectMidi = useCallback(async () => {
    const midiNavigator = navigator as NavigatorWithMidi
    if (!midiNavigator.requestMIDIAccess) {
      setMidiStatus('unsupported')
      return
    }

    setMidiStatus('requesting')
    try {
      const access = await midiNavigator.requestMIDIAccess({ sysex: false, software: false })
      accessRef.current = access
      attachInputs(access)
      access.onstatechange = () => attachInputs(access)
      setMidiStatus('ready')
    } catch {
      setMidiStatus('denied')
    }
  }, [attachInputs, setMidiStatus])

  useEffect(() => () => {
    const access = accessRef.current
    if (!access) return
    access.onstatechange = null
    access.inputs.forEach((input) => { input.onmidimessage = null })
  }, [])

  return { connectMidi }
}
