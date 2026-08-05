import { Eraser, Repeat2, Upload } from 'lucide-react'
import { useEffect } from 'react'
import { secondsUntilNextBeat } from '../audio/sampler'
import { effectiveBpm } from '../audio/tempo'
import { useMixerStore, type DeckId } from '../state/mixerStore'
import { useSamplerStore } from '../state/samplerStore'
import './sampler.css'

const padClasses = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink', 'magenta']

export function SamplerPanel() {
  const slots = useSamplerStore((state) => state.slots)
  const masterVolume = useSamplerStore((state) => state.masterVolume)
  const isHydrating = useSamplerStore((state) => state.isHydrating)
  const hydrate = useSamplerStore((state) => state.hydrate)
  const loadSlot = useSamplerStore((state) => state.loadSlot)
  const triggerSlot = useSamplerStore((state) => state.triggerSlot)
  const setSlotMode = useSamplerStore((state) => state.setSlotMode)
  const setSlotVolume = useSamplerStore((state) => state.setSlotVolume)
  const setMasterVolume = useSamplerStore((state) => state.setMasterVolume)
  const clearSlot = useSamplerStore((state) => state.clearSlot)
  const clearAll = useSamplerStore((state) => state.clearAll)
  const decks = useMixerStore((state) => state.decks)
  const masterDeck = useMixerStore((state) => state.masterDeck)
  const quantizeEnabled = useMixerStore((state) => state.quantizeEnabled)

  useEffect(() => { void hydrate() }, [hydrate])

  const referenceDeckId: DeckId | null = masterDeck
    ?? (decks.A.bpm > 0 ? 'A' : decks.B.bpm > 0 ? 'B' : null)

  const trigger = (slot: number) => {
    let delaySeconds = 0
    if (quantizeEnabled && referenceDeckId) {
      const deck = decks[referenceDeckId]
      delaySeconds = secondsUntilNextBeat(
        deck.currentTime,
        effectiveBpm(deck.bpm, deck.pitchPercent),
        deck.beatOffsetSeconds,
      )
    }
    triggerSlot(slot, delaySeconds)
  }

  return (
    <section className="sampler-panel real-sampler" id="sampler-panel" aria-label="Sampler panel">
      <div className="dock-tabs">
        <button className="active" type="button">SAMPLER</button>
        <span>{isHydrating ? 'RESTORING BANK…' : `${quantizeEnabled ? 'QNTZ' : 'FREE'} · MASTER ${referenceDeckId ?? '—'}`}</span>
        <button type="button" disabled={!slots.some((slot) => slot.isLoaded)} onClick={() => void clearAll()}>CLEAR BANK</button>
      </div>
      <div className="sampler-master-strip">
        <label><span>SAMPLER MASTER</span><input aria-label="Sampler master volume" type="range" min="0" max="1" step="0.01" value={masterVolume} onChange={(event) => setMasterVolume(Number(event.target.value))} /><b>{Math.round(masterVolume * 100)}%</b></label>
      </div>
      <div className="sampler-bank-grid">
        {slots.map((slot) => (
          <article className={`sample-slot ${padClasses[slot.slot]}${slot.isActive ? ' active' : ''}`} key={slot.slot}>
            <button className="sample-trigger" type="button" aria-label={`Trigger sample pad ${slot.slot + 1}`} disabled={!slot.isLoaded} onClick={() => trigger(slot.slot)}>
              <strong>{slot.name ?? `PAD ${slot.slot + 1}`}</strong>
              <span>{slot.isLoaded ? (slot.isActive ? 'PLAYING' : slot.mode.toUpperCase()) : 'EMPTY'}</span>
            </button>
            <div className="sample-slot-controls">
              <label className="sample-load"><Upload size={11} /><span>{slot.isLoaded ? 'REPLACE' : 'LOAD'}</span><input aria-label={`Load sample pad ${slot.slot + 1}`} type="file" accept="audio/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadSlot(slot.slot, file); event.currentTarget.value = '' }} /></label>
              <button type="button" aria-label={`Toggle sample pad ${slot.slot + 1} loop mode`} className={slot.mode === 'loop' ? 'active' : ''} onClick={() => setSlotMode(slot.slot, slot.mode === 'loop' ? 'one-shot' : 'loop')}><Repeat2 size={11} /></button>
              <button type="button" aria-label={`Clear sample pad ${slot.slot + 1}`} disabled={!slot.isLoaded} onClick={() => void clearSlot(slot.slot)}><Eraser size={11} /></button>
            </div>
            <label className="sample-volume"><span>VOL</span><input aria-label={`Sample pad ${slot.slot + 1} volume`} type="range" min="0" max="1" step="0.01" value={slot.volume} onChange={(event) => setSlotVolume(slot.slot, Number(event.target.value))} /></label>
            {slot.error && <small role="alert">{slot.error}</small>}
          </article>
        ))}
      </div>
    </section>
  )
}
