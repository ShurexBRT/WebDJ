import { Music2 } from 'lucide-react'
import { compatibilityLabel, harmonicCompatibility, KEY_OPTIONS } from '../audio/keyDetection'
import { useMixerStore, type DeckId } from '../state/mixerStore'
import './keyControls.css'

export function KeyControls({ deckId }: { deckId: DeckId }) {
  const deck = useMixerStore((state) => state.decks[deckId])
  const otherDeckId: DeckId = deckId === 'A' ? 'B' : 'A'
  const otherDeck = useMixerStore((state) => state.decks[otherDeckId])
  const setDeckKey = useMixerStore((state) => state.setDeckKey)
  const setDeckKeyAnalysis = useMixerStore((state) => state.setDeckKeyAnalysis)
  const compatibility = harmonicCompatibility(deck.camelotKey, otherDeck.camelotKey)

  const selectedValue = KEY_OPTIONS.find((option) => option.key === deck.key)?.key ?? ''
  const statusText = deck.keyAnalysisStatus === 'analyzing'
    ? 'ANALYZING KEY…'
    : deck.keyAnalysisStatus === 'failed'
      ? 'KEY NOT DETECTED'
      : deck.keyAnalysisStatus === 'manual'
        ? 'MANUAL KEY'
        : deck.keyAnalysisStatus === 'detected'
          ? `${Math.round(deck.keyConfidence * 100)}% CONFIDENCE`
          : 'KEY —'

  return (
    <section className="key-controls" aria-label={`Musical key deck ${deckId}`}>
      <div className="key-heading">
        <span><Music2 size={13} /> KEY</span>
        <strong>{deck.camelotKey || '—'}</strong>
      </div>
      <div className="key-display">
        <b>{deck.key || 'Unknown'}</b>
        <small>{statusText}</small>
      </div>
      <label>
        <span>Override</span>
        <select
          aria-label={`Key deck ${deckId}`}
          value={selectedValue}
          onChange={(event) => {
            const option = KEY_OPTIONS.find((item) => item.key === event.target.value)
            if (!option) {
              setDeckKeyAnalysis(deckId, 'idle', '', '', 0)
              return
            }
            setDeckKey(deckId, option.key, option.camelot, 'manual')
          }}
        >
          <option value="">Auto / unknown</option>
          {KEY_OPTIONS.map((option) => (
            <option key={`${option.root}-${option.mode}`} value={option.key}>
              {option.shortKey} · {option.camelot}
            </option>
          ))}
        </select>
      </label>
      <div className={`harmonic-status harmonic-${compatibility}`} title={`Deck ${otherDeckId}: ${otherDeck.key || 'unknown'}`}>
        <span>WITH {otherDeckId}</span>
        <strong>{compatibilityLabel(compatibility)}</strong>
      </div>
    </section>
  )
}
