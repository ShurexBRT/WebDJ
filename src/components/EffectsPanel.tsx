import { Waves } from 'lucide-react'
import { getAudioEngine } from '../audio/AudioEngine'
import { useMixerStore, type DeckId } from '../state/mixerStore'
import './effects.css'

export function EffectsPanel({ deckId }: { deckId: DeckId }) {
  const deck = useMixerStore((state) => state.decks[deckId])
  const setFilter = useMixerStore((state) => state.setDeckFilter)
  const setEcho = useMixerStore((state) => state.setDeckEcho)
  const setReverb = useMixerStore((state) => state.setDeckReverb)
  const engine = getAudioEngine()

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
      <div className="effects-title"><Waves size={15} /> FX</div>
      <label className="control-row"><span>Filter {deck.filter === 0 ? 'OPEN' : deck.filter < 0 ? 'LPF' : 'HPF'}</span><input aria-label={`Filter deck ${deckId}`} type="range" min="-1" max="1" step="0.01" value={deck.filter} onDoubleClick={() => { setFilter(deckId, 0); engine.setDeckFilter(deckId, 0) }} onChange={(event) => { const value = Number(event.target.value); setFilter(deckId, value); engine.setDeckFilter(deckId, value) }} /></label>
      <div className="effect-block">
        <button className={`effect-toggle${deck.echoEnabled ? ' active' : ''}`} aria-label={`Echo deck ${deckId}`} aria-pressed={deck.echoEnabled} onClick={() => applyEcho({ echoEnabled: !deck.echoEnabled })}>ECHO</button>
        <label className="control-row compact"><span>Wet {Math.round(deck.echoMix * 100)}%</span><input aria-label={`Echo mix deck ${deckId}`} type="range" min="0" max="1" step="0.01" value={deck.echoMix} onChange={(event) => applyEcho({ echoMix: Number(event.target.value) })} /></label>
        <label className="control-row compact"><span>Time {deck.echoTimeMs} ms</span><input aria-label={`Echo time deck ${deckId}`} type="range" min="50" max="1500" step="25" value={deck.echoTimeMs} onChange={(event) => applyEcho({ echoTimeMs: Number(event.target.value) })} /></label>
        <label className="control-row compact"><span>Feedback {Math.round(deck.echoFeedback * 100)}%</span><input aria-label={`Echo feedback deck ${deckId}`} type="range" min="0" max="0.85" step="0.01" value={deck.echoFeedback} onChange={(event) => applyEcho({ echoFeedback: Number(event.target.value) })} /></label>
      </div>
      <div className="effect-block compact-effect">
        <button className={`effect-toggle${deck.reverbEnabled ? ' active' : ''}`} aria-label={`Reverb deck ${deckId}`} aria-pressed={deck.reverbEnabled} onClick={() => applyReverb({ reverbEnabled: !deck.reverbEnabled })}>REVERB</button>
        <label className="control-row compact"><span>Wet {Math.round(deck.reverbMix * 100)}%</span><input aria-label={`Reverb mix deck ${deckId}`} type="range" min="0" max="0.65" step="0.01" value={deck.reverbMix} onChange={(event) => applyReverb({ reverbMix: Number(event.target.value) })} /></label>
      </div>
    </section>
  )
}
