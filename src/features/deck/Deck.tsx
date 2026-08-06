import { useEffect, useRef, type CSSProperties } from 'react'
import { ChevronsLeft, ChevronsRight, Headphones, Pause, Play, Upload } from 'lucide-react'
import { getAudioEngine } from '../../audio/AudioEngine'
import { phaseAlignedTime, phaseLabel, quantizeTime, signedPhaseErrorSeconds } from '../../audio/phaseSync'
import { effectiveBpm, pitchToMatchBpm } from '../../audio/tempo'
import { analyzeTrackFile, type TrackAnalysisResult } from '../../audio/trackAnalysis'
import { formatTime, progressFromTime, timeFromProgress } from '../../audio/transport'
import { BeatGridControls } from '../../components/BeatGridControls'
import { CueLoopControls } from '../../components/CueLoopControls'
import { EffectsPanel } from '../../components/EffectsPanel'
import { HotCueControls } from '../../components/HotCueControls'
import { KeyControls } from '../../components/KeyControls'
import { TempoControls } from '../../components/TempoControls'
import { Waveform } from '../../components/Waveform'
import { fingerprintFile, getTrackProfile } from '../../storage/trackProfiles'
import { useTrackProfilePersistence } from '../../storage/useTrackProfilePersistence'
import { useGainAssistStore } from '../../state/gainAssistStore'
import { useKeyStore } from '../../state/keyStore'
import { useLibraryStore } from '../../state/libraryStore'
import { useMixerStore, type DeckId } from '../../state/mixerStore'
import './transportControls.css'

export function Deck({ side }: { side: DeckId }) {
  useTrackProfilePersistence(side)
  const deck = useMixerStore((state) => state.decks[side])
  const deckKey = useKeyStore((state) => state.decks[side])
  const gainAssist = useGainAssistStore((state) => state.decks[side])
  const resetDeckKey = useKeyStore((state) => state.resetDeck)
  const setKeyAnalysis = useKeyStore((state) => state.setAnalysis)
  const restoreKeyProfile = useKeyStore((state) => state.restoreProfile)
  const setGainAnalysis = useGainAssistStore((state) => state.setAnalysis)
  const restoreGainProfile = useGainAssistStore((state) => state.restoreProfile)
  const resetGainAnalysis = useGainAssistStore((state) => state.resetDeckAnalysis)
  const otherSide: DeckId = side === 'A' ? 'B' : 'A'
  const otherDeck = useMixerStore((state) => state.decks[otherSide])
  const masterDeck = useMixerStore((state) => state.masterDeck)
  const quantizeEnabled = useMixerStore((state) => state.quantizeEnabled)
  const libraryRequest = useLibraryStore((state) => state.deckRequests[side])
  const consumeLibraryRequest = useLibraryStore((state) => state.consumeDeckRequest)
  const loadTrack = useMixerStore((state) => state.loadTrack)
  const setDeckIdentity = useMixerStore((state) => state.setDeckIdentity)
  const restoreDeckProfile = useMixerStore((state) => state.restoreDeckProfile)
  const setPlaying = useMixerStore((state) => state.setPlaying)
  const setDeckTime = useMixerStore((state) => state.setDeckTime)
  const setDeckWaveform = useMixerStore((state) => state.setDeckWaveform)
  const setDeckAnalysis = useMixerStore((state) => state.setDeckAnalysis)
  const setDeckBpmAnalysis = useMixerStore((state) => state.setDeckBpmAnalysis)
  const setDeckCue = useMixerStore((state) => state.setDeckCue)
  const setDeckPitch = useMixerStore((state) => state.setDeckPitch)
  const setDeckTrim = useMixerStore((state) => state.setDeckTrim)
  const setMasterDeck = useMixerStore((state) => state.setMasterDeck)
  const engine = getAudioEngine()
  const progress = progressFromTime(deck.currentTime, deck.duration)
  const gridBpm = effectiveBpm(deck.bpm, deck.pitchPercent)
  const otherGridBpm = effectiveBpm(otherDeck.bpm, otherDeck.pitchPercent)
  const isMaster = masterDeck === side
  const syncReferenceId: DeckId = masterDeck && masterDeck !== side ? masterDeck : otherSide
  const syncReference = syncReferenceId === otherSide ? otherDeck : deck
  const syncReferenceBpm = effectiveBpm(syncReference.bpm, syncReference.pitchPercent)
  const phaseError = side === syncReferenceId ? 0 : signedPhaseErrorSeconds(
    deck.currentTime,
    gridBpm,
    deck.beatOffsetSeconds,
    syncReference.currentTime,
    syncReferenceBpm,
    syncReference.beatOffsetSeconds,
  )
  const accent = side === 'A' ? '#29b6ff' : '#ff921f'
  const deckStyle = {
    '--deck-accent': accent,
    '--jog-progress': `${Math.max(0, Math.min(1, progress)) * 360}deg`,
  } as CSSProperties

  const normalizeSeekTime = (time: number) => quantizeEnabled
    ? quantizeTime(time, gridBpm, deck.beatOffsetSeconds)
    : time

  const seekToTime = (time: number) => {
    const nextTime = normalizeSeekTime(time)
    engine.seek(side, nextTime)
    setDeckTime(side, nextTime)
  }

  const seekToProgress = (nextProgress: number) => seekToTime(timeFromProgress(nextProgress, deck.duration))

  const syncToReference = () => {
    if (side === syncReferenceId) return
    const nextPitch = pitchToMatchBpm(deck.bpm, syncReferenceBpm)
    if (nextPitch === null) return

    setDeckPitch(side, nextPitch)
    engine.setDeckPitch(side, nextPitch)

    const targetTime = engine.getDeckCurrentTime(side) || deck.currentTime
    const referenceTime = engine.getDeckCurrentTime(syncReferenceId) || syncReference.currentTime
    const targetBpm = effectiveBpm(deck.bpm, nextPitch)
    const alignedTime = phaseAlignedTime(
      targetTime,
      targetBpm,
      deck.beatOffsetSeconds,
      referenceTime,
      syncReferenceBpm,
      syncReference.beatOffsetSeconds,
    )
    engine.seek(side, alignedTime)
    setDeckTime(side, alignedTime)
  }

  const toggleMaster = () => setMasterDeck(isMaster ? null : side)

  const applyAnalysis = (
    analysis: TrackAnalysisResult,
    includeWaveformAndBpm = true,
    includeKey = true,
    includeGain = true,
  ) => {
    if (includeWaveformAndBpm) {
      setDeckWaveform(side, analysis.waveform)
      if (analysis.bpm) setDeckBpmAnalysis(side, 'detected', analysis.bpm.bpm, analysis.bpm.confidence)
      else setDeckBpmAnalysis(side, 'failed', 0, 0)
    }
    if (includeKey) {
      if (analysis.key) setKeyAnalysis(side, 'detected', analysis.key.key, analysis.key.camelot, analysis.key.confidence)
      else setKeyAnalysis(side, 'failed', '', '', 0)
    }
    if (includeGain) {
      setGainAnalysis(side, analysis.gain)
      if (analysis.gain && gainAssist.enabled) {
        const trim = analysis.gain.recommendedTrimDb
        setDeckTrim(side, trim)
        engine.setDeckTrim(side, trim)
      }
    }
    setDeckAnalysis(side, false)
  }

  const handleFile = async (file?: File) => {
    if (!file) return
    loadTrack(side, file.name)
    resetDeckKey(side)
    resetGainAnalysis(side)
    setDeckAnalysis(side, true)
    setDeckBpmAnalysis(side, 'analyzing', 0, 0)
    setKeyAnalysis(side, 'analyzing', '', '', 0)
    engine.setDeckPitch(side, deck.pitchPercent)
    engine.setDeckTrim(side, deck.trim)
    engine.setDeckVolume(side, deck.volume)
    engine.setDeckFilter(side, deck.filter)
    engine.setDeckEcho(side, { enabled: deck.echoEnabled, mix: deck.echoMix, timeMs: deck.echoTimeMs, feedback: deck.echoFeedback })
    engine.setDeckReverb(side, { enabled: deck.reverbEnabled, mix: deck.reverbMix })

    const profilePromise = fingerprintFile(file)
      .then(async (trackId) => {
        setDeckIdentity(side, trackId, file.size, file.lastModified)
        return getTrackProfile(trackId)
      })
      .catch(() => null)

    try {
      await engine.loadFile(side, file, {
        onTimeUpdate: (currentTime, duration) => setDeckTime(side, currentTime, duration),
        onEnded: () => {
          setPlaying(side, false)
          setDeckTime(side, 0)
        },
      })

      const cachedProfile = await profilePromise
      if (cachedProfile) {
        restoreDeckProfile(side, cachedProfile)
        restoreKeyProfile(side, cachedProfile)
        restoreGainProfile(side, cachedProfile)
        const keyCached = (cachedProfile.keyAnalysisStatus ?? 'idle') !== 'idle'
        const gainCached = Number.isFinite(cachedProfile.gainRecommendationDb)
        if (keyCached && gainCached) {
          if (gainAssist.enabled && Number.isFinite(cachedProfile.gainRecommendationDb)) {
            const trim = cachedProfile.gainRecommendationDb!
            setDeckTrim(side, trim)
            engine.setDeckTrim(side, trim)
          }
          return
        }

        setDeckAnalysis(side, true)
        if (!keyCached) setKeyAnalysis(side, 'analyzing', '', '', 0)
        applyAnalysis(await analyzeTrackFile(file, engine.context), false, !keyCached, !gainCached)
        return
      }

      applyAnalysis(await analyzeTrackFile(file, engine.context))
    } catch (error) {
      setDeckAnalysis(side, false, error instanceof Error ? error.message : 'Audio analysis failed')
      setDeckBpmAnalysis(side, 'failed', 0, 0)
      setKeyAnalysis(side, 'failed', '', '', 0)
      setGainAnalysis(side, null)
    }
  }

  const handleFileRef = useRef(handleFile)

  useEffect(() => {
    handleFileRef.current = handleFile
  })

  useEffect(() => {
    if (!libraryRequest) return
    void handleFileRef.current(libraryRequest.track.file)
    consumeLibraryRequest(side, libraryRequest.requestId)
  }, [consumeLibraryRequest, libraryRequest, side])

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

  const canSync = !isMaster && deck.bpm > 0 && syncReference.bpm > 0

  return (
    <section className={`deck deck-${side.toLowerCase()}${isMaster ? ' deck-master' : ''}`} data-testid={`deck-${side}`} style={deckStyle}>
      <div className="deck-heading">
        <span>DECK {side}</span>
        <div className="deck-heading-actions">
          <button type="button" disabled={!canSync} onClick={syncToReference} aria-label={`Sync deck ${side} to deck ${syncReferenceId}`}>SYNC</button>
          <button className={isMaster ? 'active' : ''} type="button" aria-pressed={isMaster} onClick={toggleMaster} aria-label={`Make deck ${side} master`}>{isMaster ? 'MASTER ✓' : 'MASTER'}</button>
        </div>
      </div>

      <div className="track-overview">
        <div className="track-art" aria-hidden="true"><span>{side}</span></div>
        <div className="track-heading">
          <strong>{deck.trackName ?? 'No track loaded'}</strong>
          <span>{deck.trackId ? 'Cached local profile' : deck.trackName ? 'Local audio file' : 'Load a track to begin'}</span>
          <small>{gridBpm > 0 ? `${gridBpm.toFixed(1)} BPM` : '---.- BPM'} <b>—</b> {deckKey.camelotKey || 'KEY —'} <b>—</b> {formatTime(deck.duration)}</small>
        </div>
      </div>

      <div className="waveform-panel">
        <Waveform peaks={deck.waveform} progress={progress} accent={accent} label={`Waveform deck ${side}`} duration={deck.duration} bpm={gridBpm} beatOffsetSeconds={deck.beatOffsetSeconds} barOffsetBeats={deck.barOffsetBeats} onSeek={seekToProgress} />
        <div className="time-readout"><span>{formatTime(deck.currentTime)}</span><span>{deck.isAnalyzing ? 'ANALYZING / CHECKING CACHE…' : deck.analysisError ?? `${quantizeEnabled ? 'QNTZ' : 'FREE'} · WAVEFORM / BEAT GRID`}</span><span>-{formatTime(Math.max(0, deck.duration - deck.currentTime))}</span></div>
      </div>

      <input className="native-seek" aria-label={`Seek deck ${side}`} type="range" min="0" max={Math.max(deck.duration, 0)} step="0.1" value={Math.min(deck.currentTime, deck.duration || 0)} disabled={!deck.duration} onChange={(event) => seekToTime(Number(event.target.value))} />

      <div className="deck-transport-strip">
        <button className={`cue-button${deck.cueEnabled ? ' active' : ''}`} onClick={async () => { await engine.initialize(); const enabled = !deck.cueEnabled; setDeckCue(side, enabled); engine.setDeckCue(side, enabled) }} aria-pressed={deck.cueEnabled} aria-label={`Cue deck ${side}`}><Headphones size={16} /> CUE</button>
        <button className="mini-play-button" onClick={togglePlayback} disabled={!deck.trackName} aria-label={`${deck.isPlaying ? 'Pause' : 'Play'} deck ${side}`}>{deck.isPlaying ? <Pause size={16} /> : <Play size={16} />}<span>{deck.isPlaying ? 'PAUSE' : 'PLAY'}</span></button>
        <CueLoopControls deckId={side} />
      </div>

      <HotCueControls deckId={side} />

      <div className="deck-performance-grid">
        <div className="platter-column">
          <div className="jog-wheel" aria-label={`Jog display deck ${side}`}>
            <div className="jog-progress-ring" />
            <div className="jog-grooves" />
            <button className="transport-button" onClick={togglePlayback} disabled={!deck.trackName} aria-label={`${deck.isPlaying ? 'Pause' : 'Play'} deck ${side} platter`}>{deck.isPlaying ? <Pause /> : <Play />}</button>
            <div className="jog-readout"><strong>{gridBpm > 0 ? gridBpm.toFixed(2) : '--.--'}</strong><span>{deck.pitchPercent > 0 ? '+' : ''}{deck.pitchPercent.toFixed(1)}%</span></div>
            <span className="jog-needle" />
            <span className={`phase-readout${Math.abs(phaseError) <= 0.005 && gridBpm > 0 && otherGridBpm > 0 ? ' locked' : ''}`}>{gridBpm > 0 && otherGridBpm > 0 ? phaseLabel(phaseError) : 'PHASE —'}</span>
          </div>
          <div className="nudge-controls" aria-label={`Beat nudge deck ${side}`}>
            <button type="button" disabled={!deck.trackName} aria-label={`Nudge deck ${side} slower`} onPointerDown={() => engine.nudgeDeck(side, -1)}><ChevronsLeft size={15} /> SLOW</button>
            <button type="button" disabled={!deck.trackName} aria-label={`Nudge deck ${side} faster`} onPointerDown={() => engine.nudgeDeck(side, 1)}>FAST <ChevronsRight size={15} /></button>
          </div>
          <label className="load-track-button"><Upload size={16} /> Load local track<input data-testid={`file-input-${side}`} type="file" accept="audio/*" onChange={(event) => handleFile(event.target.files?.[0])} /></label>
        </div>

        <div className="deck-utility-stack">
          <TempoControls deckId={side} />
          <KeyControls deckId={side} />
          <BeatGridControls deckId={side} />
        </div>

        <EffectsPanel deckId={side} />
      </div>
    </section>
  )
}
