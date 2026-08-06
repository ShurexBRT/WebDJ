import type { AudioEngine } from './AudioEngine'
import type { BufferDeckTransport } from './BufferDeckTransport'
import type { DeckId } from '../state/mixerStore'

type SlipEngineInternals = {
  decks: Record<DeckId, { transport: BufferDeckTransport }>
}

function deckTransport(engine: AudioEngine, deckId: DeckId): BufferDeckTransport {
  return (engine as unknown as SlipEngineInternals).decks[deckId].transport
}

export function beginDeckSlip(engine: AudioEngine, deckId: DeckId, owner: string): boolean {
  return deckTransport(engine, deckId).beginSlip(owner)
}

export function endDeckSlip(engine: AudioEngine, deckId: DeckId, owner: string): number | null {
  return deckTransport(engine, deckId).endSlip(owner)
}

export function cancelDeckSlip(engine: AudioEngine, deckId: DeckId, returnToTimeline: boolean): number | null {
  return deckTransport(engine, deckId).cancelSlip(returnToTimeline)
}

export function isDeckSlipActive(engine: AudioEngine, deckId: DeckId): boolean {
  return deckTransport(engine, deckId).isSlipActive()
}

export function getDeckSlipHiddenTime(engine: AudioEngine, deckId: DeckId): number | null {
  return deckTransport(engine, deckId).getSlipHiddenTime()
}
