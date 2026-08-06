import type { TrackSuggestion } from './trackScoring'
import type { DeckId } from '../state/mixerStore'

export type TransitionStrategy = TrackSuggestion['transition']

export type AutoTransitionPlan = {
  trackId: string
  trackTitle: string
  outgoingDeck: DeckId
  targetDeck: DeckId
  strategy: TransitionStrategy
  beats: number
  score: number
}

export type TransitionFrame = {
  targetMix: number
  outgoingLowDb: number
  targetLowDb: number
  outgoingFilter: number
  targetFilter: number
  outgoingEcho: boolean
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))
const lerp = (from: number, to: number, progress: number) => from + (to - from) * clamp01(progress)
const smoothstep = (value: number) => {
  const safe = clamp01(value)
  return safe * safe * (3 - 2 * safe)
}

export function transitionBeats(strategy: TransitionStrategy): number {
  if (strategy === 'long-blend') return 32
  if (strategy === 'bass-swap' || strategy === 'filter-blend') return 16
  if (strategy === 'echo-out') return 8
  return 1
}

export function createAutoTransitionPlan(
  suggestion: Pick<TrackSuggestion, 'trackId' | 'transition' | 'score'>,
  trackTitle: string,
  outgoingDeck: DeckId,
  targetDeck: DeckId,
): AutoTransitionPlan {
  return {
    trackId: suggestion.trackId,
    trackTitle,
    outgoingDeck,
    targetDeck,
    strategy: suggestion.transition,
    beats: transitionBeats(suggestion.transition),
    score: suggestion.score,
  }
}

function bassSwapFrame(progress: number, beats: number): TransitionFrame {
  const safe = clamp01(progress)
  const swapWidth = beats >= 32 ? 0.14 : 0.2
  const outgoingLowDb = safe < 0.5 - swapWidth / 2 ? 0 : lerp(0, -24, (safe - (0.5 - swapWidth / 2)) / swapWidth)
  const targetLowDb = safe < 0.5 - swapWidth / 2 ? -24 : lerp(-24, 0, (safe - (0.5 - swapWidth / 2)) / swapWidth)
  return {
    targetMix: smoothstep(safe),
    outgoingLowDb,
    targetLowDb,
    outgoingFilter: 0,
    targetFilter: 0,
    outgoingEcho: false,
  }
}

export function transitionFrame(strategy: TransitionStrategy, progress: number): TransitionFrame {
  const safe = clamp01(progress)
  if (strategy === 'long-blend') return bassSwapFrame(safe, 32)
  if (strategy === 'bass-swap') return bassSwapFrame(safe, 16)
  if (strategy === 'filter-blend') {
    return {
      targetMix: smoothstep(safe),
      outgoingLowDb: 0,
      targetLowDb: 0,
      outgoingFilter: lerp(0, 0.86, safe),
      targetFilter: lerp(-0.68, 0, safe),
      outgoingEcho: false,
    }
  }
  if (strategy === 'echo-out') {
    return {
      targetMix: smoothstep(Math.max(0, (safe - 0.15) / 0.85)),
      outgoingLowDb: lerp(0, -18, safe),
      targetLowDb: 0,
      outgoingFilter: lerp(0, 0.72, safe),
      targetFilter: 0,
      outgoingEcho: safe >= 0.55,
    }
  }
  return {
    targetMix: safe < 0.78 ? 0 : 1,
    outgoingLowDb: safe < 0.78 ? 0 : -24,
    targetLowDb: 0,
    outgoingFilter: 0,
    targetFilter: 0,
    outgoingEcho: false,
  }
}

export function crossfaderForTarget(outgoingDeck: DeckId, targetMix: number): number {
  const safe = clamp01(targetMix)
  return outgoingDeck === 'A' ? lerp(-1, 1, safe) : lerp(1, -1, safe)
}
