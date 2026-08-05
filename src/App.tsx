import { useEffect, useState } from 'react'
import { Headphones, Music2, Pause, Play, RefreshCw, SlidersHorizontal, Upload } from 'lucide-react'
import { getAudioEngine } from './audio/AudioEngine'
import { decodeWaveform } from './audio/waveform'
import { formatTime, progressFromTime, timeFromProgress } from './audio/transport'
import { Waveform } from './components/Waveform'
import { useMixerStore, type DeckId } from './state/mixerStore'

function Deck({ side }: { side: DeckId }) {
  const deck = useMixerStore((state) => state.decks[side])
  const loadTrack = useMixerStore((state) => state.loadTrack)
  const setPlaying = useMixerStore((state) => state.setPlaying)
  const setVolume = useMixerStore((state) => state.setDeckVolume)
  const setDeckTime = useMixerStore((state) => state.setDeckTime)
  const setDeckEq = useMixerStore((state) => state.setDeckEq)
  const setDeckWaveform = useMixerStore((state) => state.setDeckWaveform)
  const setDeckAnalysis = useMixerStore((state) => state.setDeckAnalysis)
  const setDeckCue = useMixerStore((state) => state.setDeckCue)

  const engine = getAudioEngine()
  const progress = progressFromTime(deck.currentTime, deck.duration)
  const accent = side === 'A' ? '#29b6ff' : '#ff9a3d'

  const seekToProgress = (nextProgress: number) => {
    const nextTime = timeFromProgress(nextProgress, deck.duration)
    engine.seek(side, nextTime)
    setDeckTime(side, nextTime)
  }

  const handleFile = async (file?: File) => {
    if (!file) return

    loadTrack(side, file.name)
    setDeckAnalysis(side, true)
    engine.setDeckVolume(side, deck.volume)

    try {
      const [, waveform] = await Promise.all([
        engine.loadFile(side, file, {
          onTimeUpdate: (currentTime, duration) => setDeckTime(side, currentTime, duration),
          onEnded: () => {
            setPlaying(side, false)
            setDeckTime(side, 0)
          },
        }),
        decodeWaveform(file, engine.context),
      ])

      setDeckWaveform(side, waveform)
      setDeckAnalysis(side, false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Audio analysis failed'
      setDeckAnalysis(side, false, message)
    }
  }

  const togglePlayback = async () => {
    if (!deck.trackName) return

    if (deck.isPlaying) {
      engine.pause(side)
      setPlaying(side, false)
      return
    }

    await engine.play(side)
    setPlaying(side, true)
  }

  const changeEq = (band: 'low' | 'mid' | 'high', value: number) => {
    setDeckEq(side, band, value)
    engine.setEq(side, band, value)
  }

  const toggleCue = async () => {
    await engine.initialize()
    const enabled = !deck.cueEnabled
    setDeckCue(side, enabled)
    engine.setDeckCue(side, enabled)
  }

  return (
    <section className={`deck deck-${side.toLowerCase()}`} data-testid={`deck-${side}`}>
      <div className="deck-heading">
        <span>DECK {side}</span>
        <strong>{deck.trackName ?? 'No track loaded'}</strong>
      </div>

      <div className="waveform-panel">
        <div className="time-readout">
          <span>{formatTime(deck.currentTime)}</span>
          <span>{deck.isAnalyzing ? 'ANALYZING AUDIO…' : deck.analysisError ?? 'WAVEFORM'}</span>
          <span>{formatTime(deck.duration)}</span>
        </div>
        <Waveform
          peaks={deck.waveform}
          progress={progress}
          accent={accent}
          label={`Waveform deck ${side}`}
          onSeek={seekToProgress}
        />
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
          engine.seek(side, value)
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
        <button
          className={`cue-button${deck.cueEnabled ? ' active' : ''}`}
          onClick={toggleCue}
          aria-pressed={deck.cueEnabled}
          aria-label={`Cue deck ${side}`}
        >
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
            engine.setDeckVolume(side, value)
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

function AudioSettings() {
  const devices = useMixerStore((state) => state.outputDevices)
  const masterOutputId = useMixerStore((state) => state.masterOutputId)
  const cueOutputId = useMixerStore((state) => state.cueOutputId)
  const outputSelectionSupported = useMixerStore((state) => state.outputSelectionSupported)
  const setDevices = useMixerStore((state) => state.setOutputDevices)
  const setMasterOutputId = useMixerStore((state) => state.setMasterOutputId)
  const setCueOutputId = useMixerStore((state) => state.setCueOutputId)
  const setOutputSelectionSupported = useMixerStore((state) => state.setOutputSelectionSupported)
  const [message, setMessage] = useState('')
  const engine = getAudioEngine()

  const refreshDevices = async (requestAccess = false) => {
    try {
      const nextDevices = requestAccess ? await engine.requestOutputAccess() : await engine.listOutputDevices()
      setDevices(nextDevices)
      setMessage(nextDevices.length ? '' : 'No audio outputs were exposed by the browser.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to read audio outputs')
    }
  }

  useEffect(() => {
    const support = engine.getOutputSupport()
    setOutputSelectionSupported(support.canSelectOutput)
    if (support.canEnumerate) void refreshDevices(false)
  }, [])

  return (
    <section className="audio-settings" aria-label="Audio output settings">
      <div className="settings-heading">
        <div>
          <h2>Audio routing</h2>
          <p>Use separate system outputs for master speakers and cue headphones.</p>
        </div>
        <button className="refresh-devices" onClick={() => refreshDevices(true)}>
          <RefreshCw size={16} /> Detect devices
        </button>
      </div>

      {!outputSelectionSupported && (
        <div className="routing-warning" role="status">
          This browser cannot select output devices. Master and cue will use the system default output.
        </div>
      )}

      <div className="device-grid">
        <label>
          <span>Master output</span>
          <select
            aria-label="Master output"
            value={masterOutputId}
            disabled={!outputSelectionSupported}
            onChange={async (event) => {
              const deviceId = event.target.value
              try {
                await engine.initialize()
                await engine.setMasterOutput(deviceId)
                setMasterOutputId(deviceId)
                setMessage('')
              } catch (error) {
                setMessage(error instanceof Error ? error.message : 'Unable to set master output')
              }
            }}
          >
            <option value="default">System default</option>
            {devices.filter((device) => device.deviceId !== 'default').map((device) => (
              <option key={device.deviceId} value={device.deviceId}>{device.label}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Cue output</span>
          <select
            aria-label="Cue output"
            value={cueOutputId}
            disabled={!outputSelectionSupported}
            onChange={async (event) => {
              const deviceId = event.target.value
              try {
                await engine.initialize()
                await engine.setCueOutput(deviceId)
                setCueOutputId(deviceId)
                setMessage('')
              } catch (error) {
                setMessage(error instanceof Error ? error.message : 'Unable to set cue output')
              }
            }}
          >
            <option value="default">System default</option>
            {devices.filter((device) => device.deviceId !== 'default').map((device) => (
              <option key={device.deviceId} value={device.deviceId}>{device.label}</option>
            ))}
          </select>
        </label>
      </div>

      {message && <p className="routing-message" role="status">{message}</p>}
    </section>
  )
}

function App() {
  const crossfader = useMixerStore((state) => state.crossfader)
  const cueVolume = useMixerStore((state) => state.cueVolume)
  const cueMix = useMixerStore((state) => state.cueMix)
  const setCrossfader = useMixerStore((state) => state.setCrossfader)
  const setCueVolume = useMixerStore((state) => state.setCueVolume)
  const setCueMix = useMixerStore((state) => state.setCueMix)

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><Music2 /> <span>WebDJ</span></div>
        <div className="status"><span className="status-dot" /> Dual-deck audio with cue routing</div>
      </header>

      <div className="workspace">
        <Deck side="A" />
        <section className="mixer">
          <div className="mixer-title"><SlidersHorizontal /> MIXER</div>
          <p className="mixer-copy">Cue is pre-fader, so a lowered channel can still be previewed in headphones.</p>

          <div className="monitor-controls">
            <label className="control-row">
              <span>Cue volume</span>
              <input
                aria-label="Cue volume"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={cueVolume}
                onChange={(event) => {
                  const value = Number(event.target.value)
                  setCueVolume(value)
                  getAudioEngine().setCueVolume(value)
                }}
              />
            </label>
            <label className="control-row">
              <span>Cue / Master mix</span>
              <input
                aria-label="Cue master mix"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={cueMix}
                onChange={(event) => {
                  const value = Number(event.target.value)
                  setCueMix(value)
                  getAudioEngine().setCueMix(value)
                }}
              />
              <div className="cross-labels"><span>CUE</span><span>MASTER</span></div>
            </label>
          </div>

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

      <AudioSettings />
    </main>
  )
}

export default App
