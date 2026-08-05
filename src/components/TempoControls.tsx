import { Gauge } from 'lucide-react'
import { effectiveBpm, normalizeBpm } from '../audio/tempo'
import { getAudioEngine } from '../audio/AudioEngine'
import { useMixerStore, type DeckId } from '../state/mixerStore'
import './tempo.css'

export function TempoControls({ deckId }: { deckId: DeckId }) {
  const deck = useMixerStore((state) => state.decks[deckId])
  const setBpm = useMixerStore((state) => state.setDeckBpm)
  const setPitch = useMixerStore((state) => state.setDeckPitch)
  const engine = getAudioEngine()
  const displayedBpm = effectiveBpm(deck.bpm, deck.pitchPercent)

  const analysisLabel = (() => {
    if (deck.bpmAnalysisStatus === 'analyzing') return 'ANALYZING'
    if (deck.bpmAnalysisStatus === 'detected') return `AUTO ${Math.round(deck.bpmConfidence * 100)}%`
    if (deck.bpmAnalysisStatus === 'manual') return 'MANUAL'
    if (deck.bpmAnalysisStatus === 'failed') return 'NO BPM'
    return 'WAITING'
  })()

  const analysisDetail = (() => {
    if (deck.bpmAnalysisStatus === 'analyzing') return 'Analyzing BPM'
    if (deck.bpmAnalysisStatus === 'detected') return `Auto detected BPM with ${Math.round(deck.bpmConfidence * 100)}% confidence`
    if (deck.bpmAnalysisStatus === 'manual') return 'Manual BPM'
    if (deck.bpmAnalysisStatus === 'failed') return 'BPM not detected · enter manually'
    return 'Load a track for auto BPM'
  })()

  const applyPitch = (pitchPercent: number) => {
    setPitch(deckId, pitchPercent)
    engine.setDeckPitch(deckId, pitchPercent)
  }

  return (
    <section className="tempo-panel" aria-label={`Tempo deck ${deckId}`}>
      <div className="tempo-heading"><span><Gauge size={13} /> TEMPO</span><small>{analysisLabel}</small></div>

      <div className="tempo-display" role="status" aria-label={`BPM analysis deck ${deckId}`}>
        <span>BPM</span>
        <strong>{displayedBpm > 0 ? displayedBpm.toFixed(1) : '---.-'}</strong>
        <small>{deck.pitchPercent > 0 ? '+' : ''}{deck.pitchPercent.toFixed(1)}%</small>
        <span className="sr-only">{analysisDetail}</span>
      </div>

      <div className="tempo-edit-row">
        <label>
          <span>BASE BPM</span>
          <input
            aria-label={`BPM deck ${deckId}`}
            type="number"
            min="40"
            max="240"
            step="0.1"
            value={deck.bpm || ''}
            placeholder="120.0"
            onChange={(event) => setBpm(deckId, normalizeBpm(Number(event.target.value)), 'manual')}
          />
        </label>
        <button type="button" onClick={() => applyPitch(0)} aria-label={`Reset pitch deck ${deckId}`}>0.0</button>
      </div>

      <label className="pitch-strip">
        <span>PITCH</span>
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
        <div><small>-16</small><b>{deck.pitchPercent > 0 ? '+' : ''}{deck.pitchPercent.toFixed(1)}%</b><small>+16</small></div>
      </label>
    </section>
  )
}
