import { Headphones, Music2, Pause, Play, SlidersHorizontal, Upload } from 'lucide-react'
import { getAudioEngine } from './audio/AudioEngine'
import { useMixerStore, type DeckId } from './state/mixerStore'

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '00:00'
  const minutes = Math.floor(seconds / 60)
  const remainder = Math.floor(seconds % 60)
  return `${minutes.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`
}

function Deck({ side }: { side: DeckId }) {
  const deck = useMixerStore((state) => state.decks[side])
  const loadTrack = useMixerStore((state) => state.loadTrack)
  const setPlaying = useMixerStore((state) => state.setPlaying)
  const setVolume = useMixerStore((state) => state.setDeckVolume)
  const setDeckTime = useMixerStore((state) => state.setDeckTime)
  const setDeckEq = useMixerStore((state) => state.setDeckEq)

  const handleFile = async (file?: File) => {
    if (!file) return
    loadTrack(side, file.name)
    const engine = getAudioEngine()
    engine.setDeckVolume(side, deck.volume)
    await engine.loadFile(side, file, {
      onTimeUpdate: (currentTime, duration) => setDeckTime(side, currentTime, duration),
      onEnded: () => setPlaying(side, false),
    })
  }

  const togglePlayback = async () => {
    if (!deck.trackName) return
    const engine = getAudioEngine()
    if (deck.isPlaying) {
      engine.pause(side)
      setPlaying(side, false)
    } else {
      await engine.play(side)
      setPlaying(side, true)
    }
  }

  const changeEq = (band: 'low' | 'mid' | 'high', value: number) => {
    setDeckEq(side, band, value)
    getAudioEngine().setEq(side, band, value)
  }

  return (
    <section className={`deck deck-${side.toLowerCase()}`} data-testid={`deck-${side}`}>
      <div className="deck-heading">
        <span>DECK {side}</span>
        <strong>{deck.trackName ?? 'No track loaded'}</strong>
      </div>

      <div className="waveform-placeholder">
        <span>{formatTime(deck.currentTime)}</span>
        <span>WAVEFORM COMING NEXT</span>
        <span>{formatTime(deck.duration)}</span>
      </div>

      <input
        aria-label={`Seek deck ${side}`}
        type="range"
        min="0"
        max={Math.max(deck.duration, 0)}
        step="0.1"
        value={Math.min(deck.currentTime, deck.duration || 0)}
        disabled={!deck.duration}
        onChange={(event) => {
          const value = Number(event.target.value)
          getAudioEngine().seek(side, value)
          setDeckTime(side, value)
        }}
      />

      <div className="transport">
        <button
          className="transport-button"
          onClick={togglePlayback}
          disabled={!deck.trackName}
          aria-label={`${deck.isPlaying ? 'Pause' : 'Play'} deck ${side}`}
        >
          {deck.isPlaying ? <Pause /> : <Play />}
        </button>
        <button className="cue-button" disabled title="Cue routing is the next audio milestone">
          <Headphones size={18} /> CUE
        </button>
      </div>

      <div className="deck-controls">
        {(['high', 'mid', 'low'] as const).map((band) => (
          <label className="control-row compact" key={band}>
            <span>{band}</span>
            <input
              aria-label={`${band} EQ deck ${side}`}
              type="range"
              min="-24"
              max="12"
              step="1"
              value={deck[band]}
              onChange={(event) => changeEq(band, Number(event.target.value))}
            />
          </label>
        ))}
      </div>

      <label className="control-row">
        <span>Channel level</span>
        <input
          aria-label={`Channel level deck ${side}`}
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={deck.volume}
          onChange={(event) => {
            const value = Number(event.target.value)
            setVolume(side, value)
            getAudioEngine().setDeckVolume(side, value)
          }}
        />
      </label>

      <label className="load-track-button">
        <Upload size={17} /> Load local track
        <input
          data-testid={`file-input-${side}`}
          type="file"
          accept="audio/*"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
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
        <div className="status"><span className="status-dot" /> Local dual-deck audio enabled</div>
      </header>

      <div className="workspace">
        <Deck side="A" />
        <section className="mixer">
          <div className="mixer-title"><SlidersHorizontal /> MIXER</div>
          <p className="mixer-copy">Equal-power crossfade keeps the center from sounding thin.</p>
          <label className="crossfader">
            <span>CROSSFADER</span>
            <input
              aria-label="Crossfader"
              type="range"
              min="-1"
              max="1"
              step="0.01"
              value={crossfader}
              onChange={(event) => {
                const value = Number(event.target.value)
                setCrossfader(value)
                getAudioEngine().setCrossfader(value)
              }}
            />
            <div className="cross-labels"><span>A</span><span>B</span></div>
          </label>
        </section>
        <Deck side="B" />
      </div>

      <section className="library">
        <div>
          <h2>Local performance mode</h2>
          <p>Load one audio file per deck. Streaming sources and cue output come after the local audio path is stable.</p>
        </div>
      </section>
    </main>
  )
}

export default App
