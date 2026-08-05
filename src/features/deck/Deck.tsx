import { useCallback, type CSSProperties } from 'react'
import { Headphones, Pause, Play, Upload } from 'lucide-react'
import { getAudioEngine } from '../../audio/AudioEngine'
import { analyzeFileBpm } from '../../audio/bpmAnalysis'
import { effectiveBpm } from '../../audio/tempo'
import { formatTime, progressFromTime, timeFromProgress } from '../../audio/transport'
import { decodeWaveform } from '../../audio/waveform'
import { BeatGridControls } from '../../components/BeatGridControls'
import { CueLoopControls } from '../../components/CueLoopControls'
import { EffectsPanel } from '../../components/EffectsPanel'
import { TempoControls } from '../../components/TempoControls'
import { Waveform } from '../../components/Waveform'
import { useMixerStore, type DeckId } from '../../state/mixerStore'

export function Deck({ side }: { side: DeckId }) {
  const deck = useMixerStore((state) => state.decks[side])
  const loadTrack = useMixerStore((state) => state.loadTrack)
  const setPlaying = useMixerStore((state) => state.setPlaying)
  const setDeckTime = useMixerStore((state) => state.setDeckTime)
  const setDeckWaveform = useMixerStore((state) => state.setDeckWaveform)
  const setDeckAnalysis = useMixerStore((state) => state.setDeckAnalysis)
  const setDeckBpmAnalysis = useMixerStore((state) => state.setDeckBpmAnalysis)
  const setDeckCue = useMixerStore((state) => state.setDeckCue)
  const engine = getAudioEngine()
  const progress = progressFromTime(deck.currentTime, deck.duration)
  const gridBpm = effectiveBpm(deck.bpm, deck.pitchPercent)
  const accent = side === 'A' ? '#29b6ff' : '#ff921f'
  const deckStyle = {
    '--deck-accent': accent,
    '--jog-progress': `${Math.max(0, Math.min(1, progress)) * 360}deg`,
  } as CSSProperties

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
    <section className={`deck deck-${side.toLowerCase()}`} data-testid={`deck-${side}`} style={deckStyle}>
      <div className="deck-heading">
        <span>DECK {side}</span>
        <div className="track-heading">
          <strong>{deck.trackName ?? 'No track loaded'}</strong>
          <small>{gridBpm > 0 ? `${gridBpm.toFixed(1)} BPM` : 'BPM —'} · {deck.pitchPercent > 0 ? '+' : ''}{deck.pitchPercent.toFixed(1)}% · {formatTime(deck.duration)}</small>
        </div>
      </div>

      <div className="waveform-panel">
        <div className="time-readout"><span>{formatTime(deck.currentTime)}</span><span>{deck.isAnalyzing ? 'ANALYZING AUDIO…' : deck.analysisError ?? 'WAVEFORM / BEAT GRID'}</span><span>-{formatTime(Math.max(0, deck.duration - deck.currentTime))}</span></div>
        <Waveform peaks={deck.waveform} progress={progress} accent={accent} label={`Waveform deck ${side}`} duration={deck.duration} bpm={gridBpm} beatOffsetSeconds={deck.beatOffsetSeconds} onSeek={seekToProgress} />
      </div>

      <input className="native-seek" aria-label={`Seek deck ${side}`} type="range" min="0" max={Math.max(deck.duration, 0)} step="0.1" value={Math.min(deck.currentTime, deck.duration || 0)} disabled={!deck.duration} onChange={(event) => { const value = Number(event.target.value); engine.seek(side, value); setDeckTime(side, value) }} />

      <div className="deck-transport-strip">
        <button className={`cue-button${deck.cueEnabled ? ' active' : ''}`} onClick={async () => { await engine.initialize(); const enabled = !deck.cueEnabled; setDeckCue(side, enabled); engine.setDeckCue(side, enabled) }} aria-pressed={deck.cueEnabled} aria-label={`Cue deck ${side}`}><Headphones size={16} /> CUE</button>
        <CueLoopControls key={`${side}-${deck.trackName ?? 'empty'}`} deckId={side} />
      </div>

      <div className="deck-performance-grid">
        <div className="platter-column">
          <div className="jog-wheel" aria-label={`Jog display deck ${side}`}>
            <div className="jog-progress-ring" />
            <div className="jog-grooves" />
            <button className="transport-button" onClick={togglePlayback} disabled={!deck.trackName} aria-label={`${deck.isPlaying ? 'Pause' : 'Play'} deck ${side}`}>{deck.isPlaying ? <Pause /> : <Play />}</button>
            <div className="jog-readout"><strong>{gridBpm > 0 ? gridBpm.toFixed(2) : '--.--'}</strong><span>{deck.pitchPercent > 0 ? '+' : ''}{deck.pitchPercent.toFixed(1)}%</span></div>
            <span className="jog-needle" />
          </div>
          <label className="load-track-button"><Upload size={16} /> Load local track<input data-testid={`file-input-${side}`} type="file" accept="audio/*" onChange={(event) => handleFile(event.target.files?.[0])} /></label>
        </div>

        <div className="deck-utility-stack">
          <TempoControls deckId={side} />
          <BeatGridControls deckId={side} />
        </div>

        <EffectsPanel deckId={side} />
      </div>
    </section>
  )
}
