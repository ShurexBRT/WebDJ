import { useEffect, useRef } from 'react'
import { getAudioEngine } from '../audio/AudioEngine'
import { useMixerStore } from '../state/mixerStore'
import { loadSessionSettings, saveSessionSettings } from './sessionSettings'

export function useSessionPersistence(): void {
  const hydrated = useRef(false)
  const crossfader = useMixerStore((state) => state.crossfader)
  const masterDeck = useMixerStore((state) => state.masterDeck)
  const quantizeEnabled = useMixerStore((state) => state.quantizeEnabled)
  const masterVolume = useMixerStore((state) => state.masterVolume)
  const cueVolume = useMixerStore((state) => state.cueVolume)
  const cueMix = useMixerStore((state) => state.cueMix)
  const restoreSession = useMixerStore((state) => state.restoreSession)

  useEffect(() => {
    const settings = loadSessionSettings()
    if (settings) {
      restoreSession(settings)
      const engine = getAudioEngine()
      engine.setCrossfader(settings.crossfader)
      engine.setMasterVolume(settings.masterVolume)
      engine.setCueVolume(settings.cueVolume)
      engine.setCueMix(settings.cueMix)
    }
    hydrated.current = true
  }, [restoreSession])

  useEffect(() => {
    if (!hydrated.current) return
    const timeout = window.setTimeout(() => {
      saveSessionSettings({
        version: 1,
        crossfader,
        masterDeck,
        quantizeEnabled,
        masterVolume,
        cueVolume,
        cueMix,
      })
    }, 150)
    return () => window.clearTimeout(timeout)
  }, [crossfader, cueMix, cueVolume, masterDeck, masterVolume, quantizeEnabled])
}
