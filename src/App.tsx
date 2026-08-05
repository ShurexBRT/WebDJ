import { Clock3, Disc3, Headphones, Library, Music2, Settings, SlidersHorizontal, Waves } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { StudioDock } from './components/StudioDock'
import { Deck } from './features/deck/Deck'
import { Mixer } from './features/mixer/Mixer'
import { useMixerStore } from './state/mixerStore'

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

function App() {
  const [now, setNow] = useState(() => new Date())
  const devices = useMixerStore((state) => state.outputDevices)
  const masterOutputId = useMixerStore((state) => state.masterOutputId)
  const loadedTracks = useMixerStore((state) => Object.values(state.decks).filter((deck) => deck.trackName).length)

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(interval)
  }, [])

  const outputLabel = useMemo(() => {
    if (masterOutputId === 'default') return 'System default'
    return devices.find((device) => device.deviceId === masterOutputId)?.label ?? 'Selected output'
  }, [devices, masterOutputId])

  return (
    <main className="app-shell">
      <header className="studio-header">
        <div className="studio-brand">
          <Music2 size={24} />
          <div><strong>WEB DJ</strong><span>STUDIO</span></div>
        </div>

        <nav className="studio-nav" aria-label="Studio sections">
          <button className="active" type="button" onClick={() => scrollTo('library-dock')}><Library size={15} /> Library</button>
          <button type="button" onClick={() => scrollTo('effects-deck-A')}><Waves size={15} /> Effects</button>
          <button type="button" onClick={() => scrollTo('performance-pads')}><Disc3 size={15} /> Performance</button>
          <button type="button" disabled title="Recording will be added in a later milestone">REC</button>
          <button type="button" onClick={() => scrollTo('audio-routing')}><Settings size={15} /> Settings</button>
        </nav>

        <div className="studio-clock"><Clock3 size={14} /> {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>

        <div className="studio-status">
          <div className="status-block"><SlidersHorizontal size={15} /><span>ENGINE</span><strong>READY</strong></div>
          <div className="status-block"><Headphones size={15} /><span>OUTPUT</span><strong title={outputLabel}>{outputLabel}</strong></div>
          <span className="loaded-count">{loadedTracks}/2 decks loaded</span>
        </div>
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
