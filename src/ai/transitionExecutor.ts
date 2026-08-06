import { getAudioEngine } from '../audio/AudioEngine'
import { nextBeatContextTime, quantizeTime } from '../audio/phaseSync'
import { effectiveBpm, pitchToMatchBpm } from '../audio/tempo'
import { useAutoTransitionStore } from '../state/autoTransitionStore'
import { useMixerStore, type DeckId, type DeckState } from '../state/mixerStore'
import { crossfaderForTarget, transitionFrame, type AutoTransitionPlan } from './transitionPlan'

type DeckSnapshot = Pick<DeckState, 'low' | 'filter' | 'echoEnabled' | 'echoMix' | 'echoTimeMs' | 'echoFeedback' | 'isPlaying'>

type ActiveExecution = {
  frameId: number | null
  plan: AutoTransitionPlan
  originalCrossfader: number
  outgoing: DeckSnapshot
  target: DeckSnapshot
  cancelled: boolean
}

let activeExecution: ActiveExecution | null = null

const snapshotDeck = (deck: DeckState): DeckSnapshot => ({
  low: deck.low,
  filter: deck.filter,
  echoEnabled: deck.echoEnabled,
  echoMix: deck.echoMix,
  echoTimeMs: deck.echoTimeMs,
  echoFeedback: deck.echoFeedback,
  isPlaying: deck.isPlaying,
})

function applyLow(deckId: DeckId, value: number): void {
  const store = useMixerStore.getState()
  const engine = getAudioEngine()
  store.setDeckEq(deckId, 'low', value)
  engine.setEq(deckId, 'low', value)
}

function applyFilter(deckId: DeckId, value: number): void {
  const store = useMixerStore.getState()
  const engine = getAudioEngine()
  store.setDeckFilter(deckId, value)
  engine.setDeckFilter(deckId, value)
}

function applyEcho(deckId: DeckId, enabled: boolean, snapshot: DeckSnapshot): void {
  const store = useMixerStore.getState()
  const engine = getAudioEngine()
  store.setDeckEcho(deckId, { echoEnabled: enabled })
  engine.setDeckEcho(deckId, {
    enabled,
    mix: snapshot.echoMix,
    timeMs: snapshot.echoTimeMs,
    feedback: snapshot.echoFeedback,
  })
}

function applyCrossfader(value: number): void {
  const store = useMixerStore.getState()
  store.setCrossfader(value)
  getAudioEngine().setCrossfader(value)
}

function restoreDeck(deckId: DeckId, snapshot: DeckSnapshot): void {
  applyLow(deckId, snapshot.low)
  applyFilter(deckId, snapshot.filter)
  applyEcho(deckId, snapshot.echoEnabled, snapshot)
}

function restoreExecution(execution: ActiveExecution, pauseTarget: boolean): void {
  const store = useMixerStore.getState()
  const engine = getAudioEngine()
  if (execution.frameId !== null) cancelAnimationFrame(execution.frameId)
  restoreDeck(execution.plan.outgoingDeck, execution.outgoing)
  restoreDeck(execution.plan.targetDeck, execution.target)
  applyCrossfader(execution.originalCrossfader)
  if (pauseTarget && !execution.target.isPlaying) {
    engine.pause(execution.plan.targetDeck)
    store.setPlaying(execution.plan.targetDeck, false)
  }
}

export function cancelAutoTransition(): void {
  if (!activeExecution) {
    useAutoTransitionStore.getState().reset()
    return
  }
  activeExecution.cancelled = true
  restoreExecution(activeExecution, true)
  activeExecution = null
  useAutoTransitionStore.getState().reset()
}

export async function startAutoTransition(): Promise<boolean> {
  if (activeExecution) cancelAutoTransition()
  const transitionStore = useAutoTransitionStore.getState()
  const plan = transitionStore.plan
  if (!plan || transitionStore.status !== 'ready') return false

  const store = useMixerStore.getState()
  const outgoing = store.decks[plan.outgoingDeck]
  const target = store.decks[plan.targetDeck]
  if (!outgoing.trackId || !target.trackId || target.trackId !== plan.trackId) {
    transitionStore.fail('The prepared track is no longer loaded on the target deck')
    return false
  }
  if (!outgoing.isPlaying) {
    transitionStore.fail('Start the outgoing master deck before running Auto Transition')
    return false
  }
  const referenceBpm = effectiveBpm(outgoing.bpm, outgoing.pitchPercent)
  const nextPitch = pitchToMatchBpm(target.bpm, referenceBpm)
  if (referenceBpm <= 0 || nextPitch === null) {
    transitionStore.fail('Both tracks need valid BPM analysis')
    return false
  }

  const engine = getAudioEngine()
  const execution: ActiveExecution = {
    frameId: null,
    plan,
    originalCrossfader: store.crossfader,
    outgoing: snapshotDeck(outgoing),
    target: snapshotDeck(target),
    cancelled: false,
  }
  activeExecution = execution

  try {
    store.setMasterDeck(plan.outgoingDeck)
    store.setDeckPitch(plan.targetDeck, nextPitch)
    engine.setDeckPitch(plan.targetDeck, nextPitch)
    applyCrossfader(plan.outgoingDeck === 'A' ? -1 : 1)

    const firstFrame = transitionFrame(plan.strategy, 0)
    applyLow(plan.outgoingDeck, firstFrame.outgoingLowDb)
    applyLow(plan.targetDeck, firstFrame.targetLowDb)
    applyFilter(plan.outgoingDeck, firstFrame.outgoingFilter)
    applyFilter(plan.targetDeck, firstFrame.targetFilter)
    applyEcho(plan.outgoingDeck, firstFrame.outgoingEcho, execution.outgoing)

    const outgoingTime = engine.getDeckCurrentTime(plan.outgoingDeck) || outgoing.currentTime
    const targetStart = quantizeTime(target.cuePoint ?? target.currentTime, target.bpm, target.beatOffsetSeconds)
    engine.seek(plan.targetDeck, targetStart)
    store.setDeckTime(plan.targetDeck, targetStart)
    const startContextTime = nextBeatContextTime(
      outgoingTime,
      outgoing.bpm,
      referenceBpm,
      outgoing.beatOffsetSeconds,
      engine.context.currentTime,
    )
    const started = target.isPlaying ? true : await engine.playAt(plan.targetDeck, startContextTime)
    if (!started) throw new Error('The target deck could not be started')
    store.setPlaying(plan.targetDeck, true)
    transitionStore.start()

    const durationSeconds = Math.max(0.2, plan.beats * 60 / referenceBpm)
    const tick = () => {
      if (!activeExecution || activeExecution !== execution || execution.cancelled) return
      const progress = Math.max(0, Math.min(1, (engine.context.currentTime - startContextTime) / durationSeconds))
      const frame = transitionFrame(plan.strategy, progress)
      applyCrossfader(crossfaderForTarget(plan.outgoingDeck, frame.targetMix))
      applyLow(plan.outgoingDeck, frame.outgoingLowDb)
      applyLow(plan.targetDeck, frame.targetLowDb)
      applyFilter(plan.outgoingDeck, frame.outgoingFilter)
      applyFilter(plan.targetDeck, frame.targetFilter)
      applyEcho(plan.outgoingDeck, frame.outgoingEcho, execution.outgoing)
      useAutoTransitionStore.getState().setProgress(progress)

      if (progress < 1) {
        execution.frameId = requestAnimationFrame(tick)
        return
      }

      engine.pause(plan.outgoingDeck)
      useMixerStore.getState().setPlaying(plan.outgoingDeck, false)
      restoreDeck(plan.outgoingDeck, execution.outgoing)
      restoreDeck(plan.targetDeck, execution.target)
      applyCrossfader(plan.outgoingDeck === 'A' ? 1 : -1)
      useMixerStore.getState().setMasterDeck(plan.targetDeck)
      useAutoTransitionStore.getState().complete()
      activeExecution = null
    }
    execution.frameId = requestAnimationFrame(tick)
    return true
  } catch (error) {
    restoreExecution(execution, true)
    activeExecution = null
    transitionStore.fail(error instanceof Error ? error.message : 'Auto Transition failed')
    return false
  }
}
