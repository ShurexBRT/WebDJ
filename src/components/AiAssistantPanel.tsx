import { Bot, BrainCircuit, Play, RefreshCw, Sparkles, Square, TriangleAlert, WandSparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cancelAutoTransition, startAutoTransition } from '../ai/transitionExecutor'
import { createAutoTransitionPlan } from '../ai/transitionPlan'
import { rankTrackCandidates, type TrackIntelligence, type TrackSuggestion } from '../ai/trackScoring'
import { getTrackProfile, type TrackProfile } from '../storage/trackProfiles'
import { useAutoTransitionStore } from '../state/autoTransitionStore'
import { useGainAssistStore } from '../state/gainAssistStore'
import { useKeyStore } from '../state/keyStore'
import { useLibraryStore, type LibraryTrack } from '../state/libraryStore'
import { useMixerStore, type DeckId } from '../state/mixerStore'
import './aiAssistant.css'

type RankedTrack = TrackSuggestion & { track: LibraryTrack }

const transitionLabels: Record<TrackSuggestion['transition'], string> = {
  'long-blend': 'LONG BLEND',
  'bass-swap': 'BASS SWAP',
  'filter-blend': 'FILTER BLEND',
  'echo-out': 'ECHO OUT',
  'hard-cut': 'HARD CUT',
}

function profileConfidence(profile: TrackProfile | null): number {
  if (!profile) return 0.2
  const values = [profile.bpmConfidence, profile.keyConfidence ?? 0, profile.gainConfidence ?? 0]
    .filter((value) => Number.isFinite(value) && value > 0)
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0.35
}

function candidateIntelligence(track: LibraryTrack, profile: TrackProfile | null, lastLoadedAt: number | null): TrackIntelligence {
  const rmsDb = profile?.gainRmsDb
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    genre: track.genre,
    bpm: profile?.bpm ?? 0,
    camelotKey: profile?.camelotKey ?? '',
    rmsDb: typeof rmsDb === 'number' && Number.isFinite(rmsDb) ? rmsDb : null,
    durationSeconds: track.durationSeconds,
    analysisConfidence: profileConfidence(profile),
    lastLoadedAt,
  }
}

export function AiAssistantPanel() {
  const decks = useMixerStore((state) => state.decks)
  const masterDeck = useMixerStore((state) => state.masterDeck)
  const history = useMixerStore((state) => state.trackHistory)
  const deckKeys = useKeyStore((state) => state.decks)
  const deckGain = useGainAssistStore((state) => state.decks)
  const tracks = useLibraryStore((state) => state.tracks)
  const requestDeckLoad = useLibraryStore((state) => state.requestDeckLoad)
  const transitionStatus = useAutoTransitionStore((state) => state.status)
  const transitionPlan = useAutoTransitionStore((state) => state.plan)
  const transitionProgress = useAutoTransitionStore((state) => state.progress)
  const transitionError = useAutoTransitionStore((state) => state.error)
  const prepareTransition = useAutoTransitionStore((state) => state.prepare)
  const markTransitionReady = useAutoTransitionStore((state) => state.markReady)
  const [rankedTracks, setRankedTracks] = useState<RankedTrack[]>([])
  const [isScoring, setIsScoring] = useState(false)
  const [refreshToken, setRefreshToken] = useState(0)

  let referenceDeckId: DeckId | null = null
  if (masterDeck && decks[masterDeck].trackId) referenceDeckId = masterDeck
  if (!referenceDeckId) {
    referenceDeckId = (['A', 'B'] as DeckId[]).find((deckId) => decks[deckId].isPlaying && decks[deckId].trackId) ?? null
  }
  if (!referenceDeckId) {
    referenceDeckId = (['A', 'B'] as DeckId[]).find((deckId) => decks[deckId].trackId) ?? null
  }

  const targetDeckId: DeckId | null = referenceDeckId === 'A' ? 'B' : referenceDeckId === 'B' ? 'A' : null
  const referenceDeck = referenceDeckId ? decks[referenceDeckId] : null
  const referenceTrackId = referenceDeck?.trackId ?? null
  const referenceTrackName = referenceDeck?.trackName ?? ''
  const referenceBpm = referenceDeck?.bpm ?? 0
  const referenceBpmConfidence = referenceDeck?.bpmConfidence ?? 0
  const referenceDuration = referenceDeck?.duration ?? 0
  const referenceTrack = referenceTrackId ? tracks.find((track) => track.id === referenceTrackId) ?? null : null
  const referenceKey = referenceDeckId ? deckKeys[referenceDeckId] : null
  const referenceCamelotKey = referenceKey?.camelotKey ?? ''
  const referenceKeyConfidence = referenceKey?.confidence ?? 0
  const referenceGain = referenceDeckId ? deckGain[referenceDeckId].analysis : null
  const referenceRmsDb = referenceGain?.rmsDb ?? null
  const referenceGainConfidence = referenceGain?.confidence ?? 0
  const preparedTarget = transitionPlan ? decks[transitionPlan.targetDeck] : null
  const preparedOutgoing = transitionPlan ? decks[transitionPlan.outgoingDeck] : null

  useEffect(() => {
    let cancelled = false
    const rank = async () => {
      if (!referenceDeckId || !referenceTrackId || !referenceTrackName || tracks.length < 2) {
        setRankedTracks([])
        return
      }
      setIsScoring(true)
      const profileEntries = await Promise.all(tracks.map(async (track) => [track.id, await getTrackProfile(track.id)] as const))
      if (cancelled) return
      const profiles = new Map(profileEntries)
      const historyMap = new Map(history.map((item) => [item.id, item.lastLoadedAt]))
      const reference: TrackIntelligence = {
        id: referenceTrackId,
        title: referenceTrack?.title ?? referenceTrackName,
        artist: referenceTrack?.artist ?? 'Unknown artist',
        genre: referenceTrack?.genre ?? '',
        bpm: referenceBpm,
        camelotKey: referenceCamelotKey,
        rmsDb: referenceRmsDb,
        durationSeconds: referenceDuration,
        analysisConfidence: Math.max(0.25, (referenceBpmConfidence + referenceKeyConfidence + referenceGainConfidence) / 3),
        lastLoadedAt: historyMap.get(referenceTrackId) ?? null,
      }
      const candidates = tracks.map((track) => candidateIntelligence(track, profiles.get(track.id) ?? null, historyMap.get(track.id) ?? null))
      const scores = rankTrackCandidates(reference, candidates).slice(0, 5)
      const byId = new Map(tracks.map((track) => [track.id, track]))
      setRankedTracks(scores.flatMap((suggestion) => {
        const track = byId.get(suggestion.trackId)
        return track ? [{ ...suggestion, track }] : []
      }))
      setIsScoring(false)
    }
    void rank().catch(() => {
      if (!cancelled) {
        setRankedTracks([])
        setIsScoring(false)
      }
    })
    return () => { cancelled = true }
  }, [history, referenceBpm, referenceBpmConfidence, referenceCamelotKey, referenceDeckId, referenceDuration, referenceGainConfidence, referenceKeyConfidence, referenceRmsDb, referenceTrack, referenceTrackId, referenceTrackName, refreshToken, tracks])

  useEffect(() => {
    if (
      transitionStatus === 'preparing'
      && transitionPlan
      && preparedTarget?.trackId === transitionPlan.trackId
      && preparedTarget.bpm > 0
      && preparedTarget.duration > 0
      && !preparedTarget.isAnalyzing
    ) {
      markTransitionReady()
    }
  }, [markTransitionReady, preparedTarget?.bpm, preparedTarget?.duration, preparedTarget?.isAnalyzing, preparedTarget?.trackId, transitionPlan, transitionStatus])

  const prepareSuggestion = (suggestion: RankedTrack) => {
    if (!referenceDeckId || !targetDeckId) return
    cancelAutoTransition()
    prepareTransition(createAutoTransitionPlan(
      suggestion,
      suggestion.track.title,
      referenceDeckId,
      targetDeckId,
    ))
    requestDeckLoad(targetDeckId, suggestion.trackId)
  }

  if (!referenceDeckId || !referenceTrackId) {
    return <div className="ai-assistant-empty"><BrainCircuit size={26} /><strong>Load a reference track</strong><span>The assistant needs one loaded deck before it can rank the next song.</span></div>
  }

  return (
    <section className="ai-assistant-panel" aria-label="AI next track assistant">
      <header className="ai-assistant-header">
        <div><Bot size={19} /><span><strong>AI NEXT TRACK</strong><small>Local explainable scoring · no music leaves the browser</small></span></div>
        <button type="button" aria-label="Refresh AI suggestions" onClick={() => setRefreshToken((value) => value + 1)} disabled={isScoring}><RefreshCw size={14} /> {isScoring ? 'SCORING…' : 'REFRESH'}</button>
      </header>

      <div className="ai-reference-track">
        <span>REFERENCE · DECK {referenceDeckId}</span>
        <strong>{referenceTrack?.title ?? referenceTrackName}</strong>
        <small>{referenceBpm > 0 ? `${referenceBpm.toFixed(1)} BPM` : 'BPM unknown'} · {referenceCamelotKey || 'Key unknown'} · {referenceTrack?.genre || 'Genre unknown'}</small>
      </div>

      {transitionPlan && transitionStatus !== 'idle' && (
        <section className={`auto-transition-console status-${transitionStatus}`} aria-label="Auto Transition control">
          <div className="auto-transition-title">
            <WandSparkles size={17} />
            <span><strong>AUTO TRANSITION</strong><small>{transitionPlan.outgoingDeck} → {transitionPlan.targetDeck} · {transitionLabels[transitionPlan.strategy]} · {transitionPlan.beats} beats</small></span>
            <b>{transitionStatus.toUpperCase()}</b>
          </div>
          <div className="auto-transition-track">{transitionPlan.trackTitle}</div>
          <div className="auto-transition-progress" aria-label="Auto Transition progress"><span style={{ width: `${Math.round(transitionProgress * 100)}%` }} /></div>
          <div className="auto-transition-actions">
            <button
              type="button"
              className="start"
              aria-label="Start Auto Transition"
              disabled={transitionStatus !== 'ready' || !preparedOutgoing?.isPlaying}
              onClick={() => { void startAutoTransition() }}
            ><Play size={13} /> START</button>
            <button type="button" aria-label="Cancel Auto Transition" onClick={cancelAutoTransition}><Square size={12} /> {transitionStatus === 'running' ? 'TAKE OVER' : 'CANCEL'}</button>
          </div>
          {transitionStatus === 'preparing' && <small>Loading and analyzing Deck {transitionPlan.targetDeck}…</small>}
          {transitionStatus === 'ready' && !preparedOutgoing?.isPlaying && <small className="warning">Start Deck {transitionPlan.outgoingDeck} before the transition.</small>}
          {transitionStatus === 'ready' && preparedOutgoing?.isPlaying && <small>Ready. START launches Deck {transitionPlan.targetDeck} on the next beat.</small>}
          {transitionStatus === 'running' && <small>Automation is moving tempo, EQ, filter and crossfader. TAKE OVER restores manual control.</small>}
          {transitionStatus === 'completed' && <small>Transition complete. Deck {transitionPlan.targetDeck} is now MASTER.</small>}
          {transitionStatus === 'error' && <small className="warning">{transitionError}</small>}
        </section>
      )}

      <div className="ai-suggestion-list">
        {rankedTracks.map((suggestion, index) => (
          <article className="ai-suggestion-card" key={suggestion.trackId}>
            <div className="ai-rank"><span>#{index + 1}</span><strong>{suggestion.score}</strong><small>MATCH</small></div>
            <div className="ai-track-copy">
              <strong>{suggestion.track.title}</strong>
              <span>{suggestion.track.artist} · {suggestion.track.genre || 'Unknown genre'}</span>
              <div className="ai-reasons">
                {suggestion.reasons.map((reason) => <span key={reason}><Sparkles size={10} />{reason}</span>)}
                {suggestion.warnings.map((warning) => <span className="warning" key={warning}><TriangleAlert size={10} />{warning}</span>)}
              </div>
            </div>
            <div className="ai-plan">
              <span>{transitionLabels[suggestion.transition]}</span>
              <small>{suggestion.confidence}% analysis confidence</small>
              <div className="ai-plan-actions">
                <button type="button" disabled={!targetDeckId} aria-label={`Load AI suggestion ${suggestion.track.title} to deck ${targetDeckId ?? 'unknown'}`} onClick={() => targetDeckId && requestDeckLoad(targetDeckId, suggestion.trackId)}>LOAD {targetDeckId}</button>
                <button type="button" className="prepare" disabled={!targetDeckId || transitionStatus === 'running'} aria-label={`Prepare auto transition ${suggestion.track.title} to deck ${targetDeckId ?? 'unknown'}`} onClick={() => prepareSuggestion(suggestion)}>PREPARE</button>
              </div>
            </div>
          </article>
        ))}
        {!isScoring && rankedTracks.length === 0 && <div className="ai-assistant-empty"><BrainCircuit size={24} /><strong>No ranked candidates yet</strong><span>Add at least one more library track. Tracks with BPM, key and gain analysis receive more reliable scores.</span></div>}
      </div>

      <footer className="ai-assistant-note">Auto Transition always requires START confirmation. Full AutoDJ is the next milestone.</footer>
    </section>
  )
}
