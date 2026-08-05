import { useCallback } from 'react'
import { Headphones, Pause, Play, Upload } from 'lucide-react'
import { getAudioEngine } from '../../audio/AudioEngine'
import { analyzeFileBpm } from '../../audio/bpmAnalysis'
import { formatTime, progressFromTime, timeFromProgress } from '../../audio/transport'
import { decodeWaveform } from '../../audio/waveform'
import { EffectsPanel } from '../../components/EffectsPanel'
import { LevelMeter } from '../../components/LevelMeter'
import { TempoControls } from '../../components/TempoControls'
import { Waveform } from '../../components/Waveform'
import { useMixerStore, type DeckId } from '../../state/mixerStore'

export function Deck({ side }: { side: DeckId }) {
  const deck = useMixerStore((state) => state.decks[side])
  const loadTrack = useMixerStore((state) => state.loadTrack)
  const setPlaying = useMixerStore((state) => state.setPlaying)
  const setTrim = useMixerStore((state) => state.setDeckTrim)
  const setVolume = useMixerStore((state) => state.setDeckVolume)
  const setDeckTime = useMixerStore((state) => state.setDeckTime)
  const setDeckEq = useMixerStore((state) => state.setDeckEq)
  const setDeckWaveform = useMixerStore((state) => state.setDeckWaveform)
  const setDeckAnalysis = useMixerStore((state) => state.setDeckAnalysis)
  const setDeckBpmAnalysis = useMixerStore((state) => state.setDeckBpmAnalysis)
  const setDeckCue = useMixerStore((state) => state.setDeckCue)
  const engine = getAudioEngine()
  const readLevel = useCallback(() => engine.getDeckLevel(side), [engine, side])
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
    setDeckBpmAnalysis(side, 'analyzing', 0, 0)
    engine.setDeckPitch(side, deck.pitchPercent)
    engine.setDeckTrim(side, deck.trim)
    engine.setDeckVolume(side, deck.volume)
    engine.setDeckFilter(side, deck.filter)
    engine.setDeckEcho(side, { enabled: deck.echoEnabled, mix: deck.echoMix, timeMs: deck.echoTimeMs, feedback: deck.echoFeedback })
    engine.setDeckReverb(side, { enabled: deck.reverbEnabled, mix: deck.reverbMix })

    const bpmPromise = analyzeFileBpm(file, engine.context)
      .then((result) => {
        if (result) setDeckBpmAnalysis(side, 'detected', result.bpm, result.confidence)
        else setDeckBpmAnalysis(side, 'failed', 0, 0)
      })
      .catch(() => setDeckBpmAnalysis(side, 'failed', 0, 0))

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
      setDeckAnalysis(side, false, error instanceof Error ? error.message : 'Audio analysis failed')
    }

    await bpmPromise
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

  return (
    <section className={`deck deck-${side.toLowerCase()}`} data-testid={`deck-${side}`}>
      <div className="deck-heading"><span>DECK {side}</span><strong>{deck.trackName ?? 'No track loaded'}</strong></div>
      <div className="waveform-panel">
        <div className="time-readout"><span>{formatTime(deck.currentTime)}</span><span>{deck.isAnalyzing ? 'ANALYZING AUDIO…' : deck.analysisError ?? 'WAVEFORM'}</span><span>{formatTime(deck.duration)}</span></div>
        <Waveform peaks={deck.waveform} progress={progress} accent={accent} label={`Waveform deck ${side}`} onSeek={seekToProgress} />
      </div>
      <input aria-label={`Seek deck ${side}`} type="range" min="0" max={Math.max(deck.duration, 0)} step="0.1" value={Math.min(deck.currentTime, deck.duration || 0)} disabled={!deck.duration} onChange={(event) => { const value = Number(event.target.value); engine.seek(side, value); setDeckTime(side, value) }} />
      <div className="transport">
        <button className="transport-button" onClick={togglePlayback} disabled={!deck.trackName} aria-label={`${deck.isPlaying ? 'Pause' : 'Play'} deck ${side}`}>{deck.isPlaying ? <Pause /> : <Play />}</button>
        <button className={`cue-button${deck.cueEnabled ? ' active' : ''}`} onClick={async () => { await engine.initialize(); const enabled = !deck.cueEnabled; setDeckCue(side, enabled); engine.setDeckCue(side, enabled) }} aria-pressed={deck.cueEnabled} aria-label={`Cue deck ${side}`}><Headphones size={18} /> CUE</button>
      </div>
      <TempoControls deckId={side} />
      <div className="channel-strip">
        <LevelMeter label={`Deck ${side} level`} readLevel={readLevel} />
        <div className="channel-controls">
          <label className="control-row"><span>Trim {deck.trim > 0 ? `+${deck.trim}` : deck.trim} dB</span><input aria-label={`Trim deck ${side}`} type="range" min="-12" max="12" step="1" value={deck.trim} onChange={(event) => { const value = Number(event.target.value); setTrim(side, value); engine.setDeckTrim(side, value) }} /></label>
          <div className="deck-controls">
            {(['high', 'mid', 'low'] as const).map((band) => <label className="control-row compact" key={band}><span>{band}</span><input aria-label={`${band} EQ deck ${side}`} type="range" min="-24" max="12" step="1" value={deck[band]} onChange={(event) => { const value = Number(event.target.value); setDeckEq(side, band, value); engine.setEq(side, band, value) }} /></label>)}
          </div>
          <label className="control-row"><span>Channel level</span><input aria-label={`Channel level deck ${side}`} type="range" min="0" max="1" step="0.01" value={deck.volume} onChange={(event) => { const value = Number(event.target.value); setVolume(side, value); engine.setDeckVolume(side, value) }} /></label>
        </div>
      </div>
      <EffectsPanel deckId={side} />
      <label className="load-track-button"><Upload size={17} /> Load local track<input data-testid={`file-input-${side}`} type="file" accept="audio/*" onChange={(event) => handleFile(event.target.files?.[0])} /></label>
    </section>
  )
}
