import type { AutoTransitionPlan } from './transitionPlan'
import type { DeckId, DeckState } from '../state/mixerStore'

export function selectAutoDjReferenceDeck(
  masterDeck: DeckId | null,
  decks: Record<DeckId, DeckState>,
): DeckId | null {
  if (masterDeck && decks[masterDeck].trackId && decks[masterDeck].isPlaying) return masterDeck
  return (['A', 'B'] as DeckId[]).find((deckId) => decks[deckId].trackId && decks[deckId].isPlaying) ?? null
}

export function transitionDurationSeconds(plan: AutoTransitionPlan, effectiveBpm: number): number {
  if (!Number.isFinite(effectiveBpm) || effectiveBpm <= 0) return Number.POSITIVE_INFINITY
  return plan.beats * 60 / effectiveBpm
}

export function shouldStartPreparedTransition(
  remainingSeconds: number,
  plan: AutoTransitionPlan,
  effectiveBpm: number,
  safetySeconds = 1.5,
): boolean {
  if (!Number.isFinite(remainingSeconds) || remainingSeconds < 0) return false
  const transitionSeconds = transitionDurationSeconds(plan, effectiveBpm)
  return Number.isFinite(transitionSeconds) && remainingSeconds <= transitionSeconds + Math.max(0, safetySeconds)
}

export function freeDeckFor(referenceDeck: DeckId): DeckId {
  return referenceDeck === 'A' ? 'B' : 'A'
}
