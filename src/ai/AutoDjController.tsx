import { useEffect } from 'react'
import { effectiveBpm } from '../audio/tempo'
import { getAudioEngine } from '../audio/AudioEngine'
import { getTrackProfile, type TrackProfile } from '../storage/trackProfiles'
import { useAutoDjStore } from '../state/autoDjStore'
import { useAutoTransitionStore } from '../state/autoTransitionStore'
import { useGainAssistStore } from '../state/gainAssistStore'
import { useKeyStore } from '../state/keyStore'
import { useLibraryStore, type LibraryTrack } from '../state/libraryStore'
import { useMixerStore } from '../state/mixerStore'
import { freeDeckFor, selectAutoDjReferenceDeck, shouldStartPreparedTransition } from './autoDj'
import { startAutoTransition } from './transitionExecutor'
import { createAutoTransitionPlan } from './transitionPlan'
import { rankTrackCandidates, type TrackIntelligence } from './trackScoring'

function profileConfidence(profile: TrackProfile | null): number {
  if (!profile) return 0.2
  const values = [profile.bpmConfidence, profile.keyConfidence ?? 0, profile.gainConfidence ?? 0]
    .filter((value) => Number.isFinite(value) && value > 0)
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0.35
}

function candidateIntelligence(
  track: LibraryTrack,
  profile: TrackProfile | null,
  lastLoadedAt: number | null,
): TrackIntelligence {
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

async function selectAndPrepareNextTrack(): Promise<void> {
  const autoDj = useAutoDjStore.getState()
  const mixer = useMixerStore.getState()
  const library = useLibraryStore.getState()
  const keys = useKeyStore.getState()
  const gains = useGainAssistStore.getState()
  const referenceDeckId = selectAutoDjReferenceDeck(mixer.masterDeck, mixer.decks)
  if (!referenceDeckId) {
    autoDj.setStatus('armed')
    return
  }
  if (library.tracks.length < 2) {
    autoDj.fail('Add at least two tracks to the library')
    return
  }

  const targetDeckId = freeDeckFor(referenceDeckId)
  if (mixer.decks[targetDeckId].isPlaying) {
    autoDj.fail(`Pause Deck ${targetDeckId} or press TAKE OVER before starting Full AutoDJ`)
    return
  }

  const referenceDeck = mixer.decks[referenceDeckId]
  const referenceTrack = library.tracks.find((track) => track.id === referenceDeck.trackId)
  if (!referenceDeck.trackId || !referenceTrack) {
    autoDj.fail('The playing reference track must remain available in the library')
    return
  }

  autoDj.setStatus('selecting')
  const profileEntries = await Promise.all(library.tracks.map(async (track) => [track.id, await getTrackProfile(track.id)] as const))
  if (!useAutoDjStore.getState().enabled) return
  const currentMixer = useMixerStore.getState()
  if (currentMixer.decks[referenceDeckId].trackId !== referenceDeck.trackId) return

  const profiles = new Map(profileEntries)
  const historyMap = new Map(currentMixer.trackHistory.map((item) => [item.id, item.lastLoadedAt]))
  const reference: TrackIntelligence = {
    id: referenceDeck.trackId,
    title: referenceTrack.title,
    artist: referenceTrack.artist,
    genre: referenceTrack.genre,
    bpm: referenceDeck.bpm,
    camelotKey: keys.decks[referenceDeckId].camelotKey,
    rmsDb: gains.decks[referenceDeckId].analysis?.rmsDb ?? null,
    durationSeconds: referenceDeck.duration,
    analysisConfidence: Math.max(0.25, (
      referenceDeck.bpmConfidence
      + keys.decks[referenceDeckId].confidence
      + (gains.decks[referenceDeckId].analysis?.confidence ?? 0)
    ) / 3),
    lastLoadedAt: historyMap.get(referenceDeck.trackId) ?? null,
  }
  const candidates = library.tracks.map((track) => candidateIntelligence(
    track,
    profiles.get(track.id) ?? null,
    historyMap.get(track.id) ?? null,
  ))
  const suggestion = rankTrackCandidates(reference, candidates, Date.now(), autoDj.mixProfileId)[0]
  if (!suggestion) {
    autoDj.fail('No next-track candidate is available')
    return
  }
  if (suggestion.score < autoDj.minimumScore) {
    autoDj.fail(`Best candidate scores ${suggestion.score}; lower the minimum score or take manual control`)
    return
  }

  const track = library.tracks.find((item) => item.id === suggestion.trackId)
  if (!track) {
    autoDj.fail('The selected candidate disappeared from the library')
    return
  }

  const plan = createAutoTransitionPlan(suggestion, track.title, referenceDeckId, targetDeckId, autoDj.mixProfileId)
  useAutoTransitionStore.getState().prepare(plan)
  autoDj.setNextTrack(track.id, track.title, suggestion.score)
  autoDj.setStatus('preparing')
  library.requestDeckLoad(targetDeckId, track.id)
}

async function autoDjTick(): Promise<void> {
  const autoDj = useAutoDjStore.getState()
  if (!autoDj.enabled || autoDj.status === 'error') return

  const transition = useAutoTransitionStore.getState()
  if (transition.status === 'completed') {
    useAutoTransitionStore.getState().reset()
    autoDj.completeTransition()
    return
  }
  if (transition.status === 'error') {
    autoDj.fail(transition.error ?? 'Auto Transition failed')
    return
  }
  if (transition.status === 'running') {
    autoDj.setStatus('transitioning')
    return
  }
  if (transition.status === 'preparing' && transition.plan) {
    const target = useMixerStore.getState().decks[transition.plan.targetDeck]
    if (
      target.trackId === transition.plan.trackId
      && target.bpm > 0
      && target.duration > 0
      && !target.isAnalyzing
    ) {
      useAutoTransitionStore.getState().markReady()
      autoDj.setStatus('ready')
    } else {
      autoDj.setStatus('preparing')
    }
    return
  }

  if (transition.status === 'ready' && transition.plan) {
    autoDj.setStatus('ready')
    const mixer = useMixerStore.getState()
    const outgoing = mixer.decks[transition.plan.outgoingDeck]
    const bpm = effectiveBpm(outgoing.bpm, outgoing.pitchPercent)
    const remaining = Math.max(0, outgoing.duration - outgoing.currentTime)
    if (!outgoing.isPlaying) {
      autoDj.fail(`Deck ${transition.plan.outgoingDeck} stopped before the transition could start`)
      return
    }
    if (!shouldStartPreparedTransition(remaining, transition.plan, bpm)) return
    if (outgoing.loopRange) {
      getAudioEngine().setDeckLoop(transition.plan.outgoingDeck, null)
      mixer.setDeckLoopRange(transition.plan.outgoingDeck, null)
    }
    const started = await startAutoTransition()
    if (started) autoDj.setStatus('transitioning')
    else autoDj.fail(useAutoTransitionStore.getState().error ?? 'Auto Transition could not start')
    return
  }

  await selectAndPrepareNextTrack()
}

export function AutoDjController() {
  const enabled = useAutoDjStore((state) => state.enabled)

  useEffect(() => {
    if (!enabled) return
    let disposed = false
    let working = false
    const run = async () => {
      if (disposed || working) return
      working = true
      try {
        await autoDjTick()
      } catch (error) {
        useAutoDjStore.getState().fail(error instanceof Error ? error.message : 'Full AutoDJ failed')
      } finally {
        working = false
      }
    }
    void run()
    const interval = window.setInterval(() => { void run() }, 400)
    return () => {
      disposed = true
      window.clearInterval(interval)
    }
  }, [enabled])

  return null
}
