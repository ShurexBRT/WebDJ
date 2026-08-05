import { Disc3, Library, Music2, Settings, Waves } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { getAudioEngine } from './audio/AudioEngine'
import { HorizontalMeter } from './components/HorizontalMeter'
import { KnobControl } from './components/KnobControl'
import { StudioDock } from './components/StudioDock'
import { Deck } from './features/deck/Deck'
import { Mixer } from './features/mixer/Mixer'
import { useMixerStore } from './state/mixerStore'

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

function App() {
  const [now, setNow] = useState(() => new Date())
  const devices = useMixerStore((state) => state.outputDevices)
  const masterOutputId = useMixerStore((state) => state.masterOutputId)
  const masterVolume = useMixerStore((state) => state.masterVolume)
  const outputSelectionSupported = useMixerStore((state) => state.outputSelectionSupported)
  const setMasterOutputId = useMixerStore((state) => state.setMasterOutputId)
  const setMasterVolume = useMixerStore((state) => state.setMasterVolume)
  const engine = getAudioEngine()
  const readMasterLevel = useCallback(() => engine.getMasterLevel(), [engine])

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(interval)
  }, [])

  return (
    <main className="app-shell">
      <header className="studio-header">
        <div className="studio-brand">
          <Music2 size={24} />
          <div><strong>WEB DJ</strong><span>STUDIO</span></div>
        </div>

        <nav className="studio-nav" aria-label="Studio sections">
          <button className="active" type="button" onClick={() => scrollTo('library-dock')}><Library size={14} /> Library</button>
          <button type="button" onClick={() => scrollTo('effects-deck-A')}><Waves size={14} /> Effects</button>
          <button type="button" onClick={() => scrollTo('sampler-panel')}><Disc3 size={14} /> Sampler</button>
          <button type="button" disabled title="Recording will be added in a later milestone">REC</button>
          <button type="button" onClick={() => scrollTo('audio-routing')}><Settings size={14} /> Settings</button>
        </nav>

        <div className="studio-clock">{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>

        <div className="header-master">
          <KnobControl label="MASTER" ariaLabel="Header master volume" value={masterVolume} min={0} max={1} step={0.01} accent="#d9e3ea" valueLabel="" onDoubleClick={() => { setMasterVolume(0.9); engine.setMasterVolume(0.9) }} onChange={(value) => { setMasterVolume(value); engine.setMasterVolume(value) }} />
          <HorizontalMeter label="Header master level" readLevel={readMasterLevel} />
        </div>

        <div className="cpu-status"><span>CPU</span><div><i /></div><strong>{navigator.hardwareConcurrency || '—'}C</strong></div>

        <label className="header-output">
          <span>OUTPUT</span>
          <select aria-label="Header master output" value={masterOutputId} disabled={!outputSelectionSupported} onChange={async (event) => { const id = event.target.value; await engine.initialize(); await engine.setMasterOutput(id); setMasterOutputId(id) }}>
            <option value="default">Speakers (Default)</option>
            {devices.filter((device) => device.deviceId !== 'default').map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>)}
          </select>
        </label>
        <button className="header-settings" type="button" aria-label="Open audio settings" onClick={() => scrollTo('audio-routing')}><Settings size={16} /></button>
      </header>

      <div className="workspace" id="mixer-workspace">
        <Deck side="A" />
        <Mixer />
        <Deck side="B" />
      </div>

      <StudioDock />
    </main>
  )
}

export default App
