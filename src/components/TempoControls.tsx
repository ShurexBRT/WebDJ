import { Gauge } from 'lucide-react'
import { effectiveBpm, normalizeBpm, pitchToMatchBpm } from '../audio/tempo'
import { getAudioEngine } from '../audio/AudioEngine'
import { useMixerStore, type DeckId } from '../state/mixerStore'

export function TempoControls({ deckId }: { deckId: DeckId }) {
  const deck = useMixerStore((state) => state.decks[deckId])
  const otherDeckId: DeckId = deckId === 'A' ? 'B' : 'A'
  const otherDeck = useMixerStore((state) => state.decks[otherDeckId])
  const setBpm = useMixerStore((state) => state.setDeckBpm)
  const setPitch = useMixerStore((state) => state.setDeckPitch)
  const engine = getAudioEngine()
  const displayedBpm = effectiveBpm(deck.bpm, deck.pitchPercent)

  const applyPitch = (pitchPercent: number) => {
    setPitch(deckId, pitchPercent)
    engine.setDeckPitch(deckId, pitchPercent)
  }

  const syncToOtherDeck = () => {
    const targetBpm = effectiveBpm(otherDeck.bpm, otherDeck.pitchPercent)
    const nextPitch = pitchToMatchBpm(deck.bpm, targetBpm)
    if (nextPitch === null) return
    applyPitch(nextPitch)
  }

  return (
    <section className="tempo-panel" aria-label={`Tempo deck ${deckId}`}>
      <div className="tempo-heading">
        <span><Gauge size={15} /> TEMPO</span>
        <strong>{displayedBpm > 0 ? `${displayedBpm.toFixed(1)} BPM` : '--.- BPM'}</strong>
      </div>

      <label className="control-row compact">
        <span>Base BPM</span>
        <input
          aria-label={`BPM deck ${deckId}`}
          type="number"
          min="40"
          max="240"
          step="0.1"
          value={deck.bpm || ''}
          placeholder="120.0"
          onChange={(event) => setBpm(deckId, normalizeBpm(Number(event.target.value)))}
        />
      </label>

      <label className="control-row compact">
        <span>Pitch {deck.pitchPercent > 0 ? '+' : ''}{deck.pitchPercent.toFixed(1)}%</span>
        <input
          aria-label={`Pitch deck ${deckId}`}
          type="range"
          min="-16"
          max="16"
          step="0.1"
          value={deck.pitchPercent}
          onDoubleClick={() => applyPitch(0)}
          onChange={(event) => applyPitch(Number(event.target.value))}
        />
      </label>

      <button
        className="sync-button"
        type="button"
        aria-label={`Sync deck ${deckId} to deck ${otherDeckId}`}
        disabled={deck.bpm <= 0 || otherDeck.bpm <= 0}
        onClick={syncToOtherDeck}
      >
        SYNC TO {otherDeckId}
      </button>
    </section>
  )
}
