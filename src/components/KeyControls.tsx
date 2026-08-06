import { Music2 } from 'lucide-react'
import { compatibilityLabel, harmonicCompatibility, KEY_OPTIONS } from '../audio/keyDetection'
import { useKeyStore } from '../state/keyStore'
import type { DeckId } from '../state/mixerStore'
import './keyControls.css'

export function KeyControls({ deckId }: { deckId: DeckId }) {
  const deck = useKeyStore((state) => state.decks[deckId])
  const otherDeckId: DeckId = deckId === 'A' ? 'B' : 'A'
  const otherDeck = useKeyStore((state) => state.decks[otherDeckId])
  const setManual = useKeyStore((state) => state.setManual)
  const setAnalysis = useKeyStore((state) => state.setAnalysis)
  const compatibility = harmonicCompatibility(deck.camelotKey, otherDeck.camelotKey)
  const selectedValue = KEY_OPTIONS.find((option) => option.key === deck.key)?.key ?? ''

  const statusText = deck.status === 'analyzing'
    ? 'ANALYZING KEY…'
    : deck.status === 'failed'
      ? 'KEY NOT DETECTED'
      : deck.status === 'manual'
        ? 'MANUAL KEY'
        : deck.status === 'detected'
          ? `${Math.round(deck.confidence * 100)}% CONFIDENCE`
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
              setAnalysis(deckId, 'idle', '', '', 0)
              return
            }
            setManual(deckId, option.key, option.camelot)
          }}
        >
          <option value="">Auto / unknown</option>
          {KEY_OPTIONS.map((option) => (
            <option key={`${option.root}-${option.mode}`} value={option.key}>{option.shortKey} · {option.camelot}</option>
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
