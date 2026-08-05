import { Music2 } from 'lucide-react'
import { Deck } from './features/deck/Deck'
import { Mixer } from './features/mixer/Mixer'
import { AudioSettings } from './features/settings/AudioSettings'

function App() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><Music2 /> <span>WebDJ</span></div>
        <div className="status"><span className="status-dot" /> Dual-deck FX engine enabled</div>
      </header>

      <div className="workspace">
        <Deck side="A" />
        <Mixer />
        <Deck side="B" />
      </div>

      <AudioSettings />
    </main>
  )
}

export default App
