import { useCallback } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { getAudioEngine } from '../../audio/AudioEngine'
import { LevelMeter } from '../../components/LevelMeter'
import { useMixerStore } from '../../state/mixerStore'

export function Mixer() {
  const crossfader = useMixerStore((state) => state.crossfader)
  const masterVolume = useMixerStore((state) => state.masterVolume)
  const cueVolume = useMixerStore((state) => state.cueVolume)
  const cueMix = useMixerStore((state) => state.cueMix)
  const setCrossfader = useMixerStore((state) => state.setCrossfader)
  const setMasterVolume = useMixerStore((state) => state.setMasterVolume)
  const setCueVolume = useMixerStore((state) => state.setCueVolume)
  const setCueMix = useMixerStore((state) => state.setCueMix)
  const engine = getAudioEngine()
  const readMasterLevel = useCallback(() => engine.getMasterLevel(), [engine])

  return (
    <section className="mixer">
      <div className="mixer-title"><SlidersHorizontal /> MIXER</div>
      <p className="mixer-copy">Trim feeds the EQ, FX and meter before the channel fader. Cue remains pre-fader.</p>
      <div className="master-strip">
        <LevelMeter label="Master level" readLevel={readMasterLevel} />
        <label className="control-row"><span>Master volume</span><input aria-label="Master volume" type="range" min="0" max="1" step="0.01" value={masterVolume} onChange={(event) => { const value = Number(event.target.value); setMasterVolume(value); engine.setMasterVolume(value) }} /></label>
      </div>
      <div className="monitor-controls">
        <label className="control-row"><span>Cue volume</span><input aria-label="Cue volume" type="range" min="0" max="1" step="0.01" value={cueVolume} onChange={(event) => { const value = Number(event.target.value); setCueVolume(value); engine.setCueVolume(value) }} /></label>
        <label className="control-row"><span>Cue / Master mix</span><input aria-label="Cue master mix" type="range" min="0" max="1" step="0.01" value={cueMix} onChange={(event) => { const value = Number(event.target.value); setCueMix(value); engine.setCueMix(value) }} /><div className="cross-labels"><span>CUE</span><span>MASTER</span></div></label>
      </div>
      <label className="crossfader"><span>CROSSFADER</span><input aria-label="Crossfader" type="range" min="-1" max="1" step="0.01" value={crossfader} onChange={(event) => { const value = Number(event.target.value); setCrossfader(value); engine.setCrossfader(value) }} /><div className="cross-labels"><span>A</span><span>B</span></div></label>
    </section>
  )
}
