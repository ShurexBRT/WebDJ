import { Crosshair } from 'lucide-react'
import { effectiveBpm } from '../audio/tempo'
import { normalizeBeatOffset } from '../audio/beatGrid'
import { useMixerStore, type DeckId } from '../state/mixerStore'
import './beatGrid.css'

const NUDGE_SECONDS = 0.01

export function BeatGridControls({ deckId }: { deckId: DeckId }) {
  const deck = useMixerStore((state) => state.decks[deckId])
  const setBeatOffset = useMixerStore((state) => state.setDeckBeatOffset)
  const bpm = effectiveBpm(deck.bpm, deck.pitchPercent)
  const disabled = bpm <= 0 || deck.duration <= 0

  const applyOffset = (value: number) => {
    setBeatOffset(deckId, normalizeBeatOffset(value, bpm))
  }

  return (
    <section className="beat-grid-controls" aria-label={`Beat grid deck ${deckId}`}>
      <div className="beat-grid-status">
        <span><Crosshair size={12} /> GRID</span>
        <strong>{disabled ? 'LOCKED' : `${Math.round(deck.beatOffsetSeconds * 1000)} ms`}</strong>
      </div>
      <div className="beat-grid-actions">
        <button type="button" aria-label={`Nudge beat grid earlier deck ${deckId}`} disabled={disabled} onClick={() => applyOffset(deck.beatOffsetSeconds - NUDGE_SECONDS)}>−10</button>
        <button type="button" aria-label={`Reset beat grid deck ${deckId}`} disabled={disabled} onClick={() => applyOffset(0)}>ZERO</button>
        <button type="button" aria-label={`Nudge beat grid later deck ${deckId}`} disabled={disabled} onClick={() => applyOffset(deck.beatOffsetSeconds + NUDGE_SECONDS)}>+10</button>
      </div>
    </section>
  )
}
