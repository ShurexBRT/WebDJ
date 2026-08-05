import { useCallback } from 'react'
import { Headphones, SlidersHorizontal } from 'lucide-react'
import { getAudioEngine } from '../../audio/AudioEngine'
import { KnobControl } from '../../components/KnobControl'
import { LevelMeter } from '../../components/LevelMeter'
import { useMixerStore, type DeckId } from '../../state/mixerStore'

const accentFor = (deckId: DeckId) => deckId === 'A' ? '#29b6ff' : '#ff921f'
const dbLabel = (value: number) => `${value > 0 ? '+' : ''}${value} dB`

function ChannelStrip({ deckId }: { deckId: DeckId }) {
  const deck = useMixerStore((state) => state.decks[deckId])
  const setTrim = useMixerStore((state) => state.setDeckTrim)
  const setVolume = useMixerStore((state) => state.setDeckVolume)
  const setDeckEq = useMixerStore((state) => state.setDeckEq)
  const setFilter = useMixerStore((state) => state.setDeckFilter)
  const engine = getAudioEngine()
  const accent = accentFor(deckId)
  const readLevel = useCallback(() => engine.getDeckLevel(deckId), [deckId, engine])

  return (
    <div className={`mixer-channel mixer-channel-${deckId.toLowerCase()}`}>
      <div className="channel-title"><span>CHANNEL {deckId === 'A' ? '1' : '2'}</span><strong>DECK {deckId}</strong></div>
      <KnobControl label="GAIN" ariaLabel={`Trim deck ${deckId}`} value={deck.trim} min={-12} max={12} step={1} accent={accent} valueLabel={dbLabel(deck.trim)} onDoubleClick={() => { setTrim(deckId, 0); engine.setDeckTrim(deckId, 0) }} onChange={(value) => { setTrim(deckId, value); engine.setDeckTrim(deckId, value) }} />
      {(['high', 'mid', 'low'] as const).map((band) => (
        <KnobControl key={band} label={band.toUpperCase()} ariaLabel={`${band} EQ deck ${deckId}`} value={deck[band]} min={-24} max={12} step={1} accent={accent} valueLabel={dbLabel(deck[band])} onDoubleClick={() => { setDeckEq(deckId, band, 0); engine.setEq(deckId, band, 0) }} onChange={(value) => { setDeckEq(deckId, band, value); engine.setEq(deckId, band, value) }} />
      ))}
      <KnobControl label="FILTER" ariaLabel={`Mixer filter deck ${deckId}`} value={deck.filter} min={-1} max={1} step={0.01} accent={accent} valueLabel={deck.filter === 0 ? 'OPEN' : deck.filter < 0 ? 'LPF' : 'HPF'} onDoubleClick={() => { setFilter(deckId, 0); engine.setDeckFilter(deckId, 0) }} onChange={(value) => { setFilter(deckId, value); engine.setDeckFilter(deckId, value) }} />
      <div className="channel-fader-zone">
        <LevelMeter label={`Deck ${deckId} level`} readLevel={readLevel} />
        <label className="vertical-fader-label">
          <span>LEVEL</span>
          <input className="vertical-fader" aria-label={`Channel level deck ${deckId}`} type="range" min="0" max="1" step="0.01" value={deck.volume} onDoubleClick={() => { setVolume(deckId, 0.8); engine.setDeckVolume(deckId, 0.8) }} onChange={(event) => { const value = Number(event.target.value); setVolume(deckId, value); engine.setDeckVolume(deckId, value) }} />
          <small>{Math.round(deck.volume * 100)}%</small>
        </label>
      </div>
    </div>
  )
}

export function Mixer() {
  const crossfader = useMixerStore((state) => state.crossfader)
  const masterVolume = useMixerStore((state) => state.masterVolume)
  const cueVolume = useMixerStore((state) => state.cueVolume)
  const cueMix = useMixerStore((state) => state.cueMix)
  const setCrossfader = useMixerStore((state) => state.setCrossfader)
  const setMasterVolume = useMixerStore((state) => state.setMasterVolume)
  const setCueVolume = useMixerStore((state) => state.setCueVolume)
  const setCueMix = useMixerStore((state) => state.setCueMix)
  const engine = getAudioEngine()
  const readMasterLevel = useCallback(() => engine.getMasterLevel(), [engine])

  return (
    <section className="mixer" id="central-mixer">
      <div className="mixer-tabs"><button className="active" type="button"><SlidersHorizontal size={15} /> MIXER</button><span>DUAL CHANNEL</span></div>
      <div className="mixer-console">
        <ChannelStrip deckId="A" />
        <div className="master-channel">
          <div className="channel-title"><span>MASTER</span><strong>OUT</strong></div>
          <KnobControl label="MASTER" ariaLabel="Master volume" value={masterVolume} min={0} max={1} step={0.01} accent="#f4c542" valueLabel={`${Math.round(masterVolume * 100)}%`} onDoubleClick={() => { setMasterVolume(0.9); engine.setMasterVolume(0.9) }} onChange={(value) => { setMasterVolume(value); engine.setMasterVolume(value) }} />
          <div className="master-meter-pair">
            <LevelMeter label="Master level" readLevel={readMasterLevel} />
            <LevelMeter label="Master level duplicate" readLevel={readMasterLevel} />
          </div>
          <KnobControl label="CUE" ariaLabel="Cue volume" value={cueVolume} min={0} max={1} step={0.01} accent="#29b6ff" valueLabel={`${Math.round(cueVolume * 100)}%`} onDoubleClick={() => { setCueVolume(0.8); engine.setCueVolume(0.8) }} onChange={(value) => { setCueVolume(value); engine.setCueVolume(value) }} />
          <label className="cue-mix-control">
            <span><Headphones size={14} /> CUE MIX</span>
            <input aria-label="Cue master mix" type="range" min="0" max="1" step="0.01" value={cueMix} onChange={(event) => { const value = Number(event.target.value); setCueMix(value); engine.setCueMix(value) }} />
            <div className="cross-labels"><span>CUE</span><span>MASTER</span></div>
          </label>
        </div>
        <ChannelStrip deckId="B" />
      </div>
      <label className="crossfader">
        <span className="cross-title"><b>A</b> CROSSFADER <b>B</b></span>
        <input aria-label="Crossfader" type="range" min="-1" max="1" step="0.01" value={crossfader} onDoubleClick={() => { setCrossfader(0); engine.setCrossfader(0) }} onChange={(event) => { const value = Number(event.target.value); setCrossfader(value); engine.setCrossfader(value) }} />
      </label>
    </section>
  )
}
