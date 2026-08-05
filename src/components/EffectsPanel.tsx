import { Waves } from 'lucide-react'
import { getAudioEngine } from '../audio/AudioEngine'
import { useMixerStore, type DeckId } from '../state/mixerStore'
import { KnobControl } from './KnobControl'
import './effects.css'

export function EffectsPanel({ deckId }: { deckId: DeckId }) {
  const deck = useMixerStore((state) => state.decks[deckId])
  const setFilter = useMixerStore((state) => state.setDeckFilter)
  const setEcho = useMixerStore((state) => state.setDeckEcho)
  const setReverb = useMixerStore((state) => state.setDeckReverb)
  const engine = getAudioEngine()
  const accent = deckId === 'A' ? '#25b6ff' : '#ff921f'

  const applyEcho = (patch: Partial<Pick<typeof deck, 'echoEnabled' | 'echoMix' | 'echoTimeMs' | 'echoFeedback'>>) => {
    const next = { ...deck, ...patch }
    setEcho(deckId, patch)
    engine.setDeckEcho(deckId, {
      enabled: next.echoEnabled,
      mix: next.echoMix,
      timeMs: next.echoTimeMs,
      feedback: next.echoFeedback,
    })
  }

  const applyReverb = (patch: Partial<Pick<typeof deck, 'reverbEnabled' | 'reverbMix'>>) => {
    const next = { ...deck, ...patch }
    setReverb(deckId, patch)
    engine.setDeckReverb(deckId, { enabled: next.reverbEnabled, mix: next.reverbMix })
  }

  return (
    <section id={`effects-deck-${deckId}`} className={`effects-panel effects-panel-${deckId.toLowerCase()}`} aria-label={`Effects deck ${deckId}`}>
      <div className="effects-title"><Waves size={14} /> FX UNIT</div>

      <div className="fx-display" aria-label={`FX status deck ${deckId}`}>
        <span>DECK {deckId} · FX1</span>
        <strong>{deck.echoEnabled ? 'ECHO' : deck.reverbEnabled ? 'REVERB' : 'BYPASS'}</strong>
        <small>{deck.echoEnabled ? `${deck.echoTimeMs} ms · ${Math.round(deck.echoMix * 100)}% wet` : deck.reverbEnabled ? `${Math.round(deck.reverbMix * 100)}% wet` : 'Select an effect'}</small>
      </div>

      <div className="fx-knob-row fx-filter-row">
        <KnobControl
          label="FILTER"
          ariaLabel={`Filter deck ${deckId}`}
          value={deck.filter}
          min={-1}
          max={1}
          step={0.01}
          accent={accent}
          valueLabel={deck.filter === 0 ? 'OPEN' : deck.filter < 0 ? 'LPF' : 'HPF'}
          onDoubleClick={() => { setFilter(deckId, 0); engine.setDeckFilter(deckId, 0) }}
          onChange={(value) => { setFilter(deckId, value); engine.setDeckFilter(deckId, value) }}
        />
      </div>

      <div className="fx-module">
        <button className={`effect-toggle${deck.echoEnabled ? ' active' : ''}`} aria-label={`Echo deck ${deckId}`} aria-pressed={deck.echoEnabled} onClick={() => applyEcho({ echoEnabled: !deck.echoEnabled })}>ECHO</button>
        <div className="fx-knob-row">
          <KnobControl label="WET" ariaLabel={`Echo mix deck ${deckId}`} value={deck.echoMix} min={0} max={1} step={0.01} accent={accent} valueLabel={`${Math.round(deck.echoMix * 100)}%`} onChange={(value) => applyEcho({ echoMix: value })} />
          <KnobControl label="TIME" ariaLabel={`Echo time deck ${deckId}`} value={deck.echoTimeMs} min={50} max={1500} step={25} accent={accent} valueLabel={`${deck.echoTimeMs}ms`} onChange={(value) => applyEcho({ echoTimeMs: value })} />
          <KnobControl label="FDBK" ariaLabel={`Echo feedback deck ${deckId}`} value={deck.echoFeedback} min={0} max={0.85} step={0.01} accent={accent} valueLabel={`${Math.round(deck.echoFeedback * 100)}%`} onChange={(value) => applyEcho({ echoFeedback: value })} />
        </div>
      </div>

      <div className="fx-module reverb-module">
        <button className={`effect-toggle${deck.reverbEnabled ? ' active' : ''}`} aria-label={`Reverb deck ${deckId}`} aria-pressed={deck.reverbEnabled} onClick={() => applyReverb({ reverbEnabled: !deck.reverbEnabled })}>REVERB</button>
        <KnobControl label="WET" ariaLabel={`Reverb mix deck ${deckId}`} value={deck.reverbMix} min={0} max={0.65} step={0.01} accent={accent} valueLabel={`${Math.round(deck.reverbMix * 100)}%`} onChange={(value) => applyReverb({ reverbMix: value })} />
      </div>
    </section>
  )
}
