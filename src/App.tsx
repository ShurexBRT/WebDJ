import { Headphones, Music2, Play, Pause, SlidersHorizontal } from 'lucide-react'
import { useMixerStore } from './state/mixerStore'

function Deck({ side }: { side: 'A' | 'B' }) {
  const deck = useMixerStore((state) => state.decks[side])
  const togglePlay = useMixerStore((state) => state.togglePlay)
  const setVolume = useMixerStore((state) => state.setDeckVolume)

  return (
    <section className={`deck deck-${side.toLowerCase()}`}>
      <div className="deck-heading">
        <span>DECK {side}</span>
        <strong>{deck.trackName ?? 'No track loaded'}</strong>
      </div>
      <div className="waveform-placeholder">WAVEFORM</div>
      <div className="transport">
        <button className="transport-button" onClick={() => togglePlay(side)} aria-label={`${deck.isPlaying ? 'Pause' : 'Play'} deck ${side}`}>
          {deck.isPlaying ? <Pause /> : <Play />}
        </button>
        <button className="cue-button"><Headphones size={18} /> CUE</button>
      </div>
      <label className="control-row">
        <span>Channel level</span>
        <input type="range" min="0" max="1" step="0.01" value={deck.volume} onChange={(event) => setVolume(side, Number(event.target.value))} />
      </label>
    </section>
  )
}

function App() {
  const crossfader = useMixerStore((state) => state.crossfader)
  const setCrossfader = useMixerStore((state) => state.setCrossfader)

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><Music2 /> <span>WebDJ</span></div>
        <div className="status"><span className="status-dot" /> Audio engine scaffold ready</div>
      </header>

      <div className="workspace">
        <Deck side="A" />
        <section className="mixer">
          <div className="mixer-title"><SlidersHorizontal /> MIXER</div>
          <div className="eq-grid">
            {['HIGH', 'MID', 'LOW', 'FILTER'].map((label) => <div className="knob" key={label}><span>{label}</span><div className="knob-face" /></div>)}
          </div>
          <label className="crossfader">
            <span>CROSSFADER</span>
            <input type="range" min="-1" max="1" step="0.01" value={crossfader} onChange={(event) => setCrossfader(Number(event.target.value))} />
            <div className="cross-labels"><span>A</span><span>B</span></div>
          </label>
        </section>
        <Deck side="B" />
      </div>

      <section className="library">
        <div>
          <h2>Music library</h2>
          <p>Local files first. Audius and Jamendo adapters come after the core audio path is proven.</p>
        </div>
        <button>Load local track</button>
      </section>
    </main>
  )
}

export default App
