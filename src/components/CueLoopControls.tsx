import { useEffect, useState } from 'react'
import { CornerDownLeft, Flag, Repeat2 } from 'lucide-react'
import { getAudioEngine } from '../audio/AudioEngine'
import { createLoopRange, LOOP_BEAT_OPTIONS, type LoopBeats } from '../audio/loop'
import { quantizeTime } from '../audio/phaseSync'
import { effectiveBpm } from '../audio/tempo'
import { formatTime } from '../audio/transport'
import { useMixerStore, type DeckId } from '../state/mixerStore'
import './cueLoop.css'

export function CueLoopControls({ deckId }: { deckId: DeckId }) {
  const deck = useMixerStore((state) => state.decks[deckId])
  const quantizeEnabled = useMixerStore((state) => state.quantizeEnabled)
  const setDeckTime = useMixerStore((state) => state.setDeckTime)
  const setDeckCuePoint = useMixerStore((state) => state.setDeckCuePoint)
  const setDeckLoopBeats = useMixerStore((state) => state.setDeckLoopBeats)
  const [loopRange, setLoopRange] = useState<{ start: number; end: number } | null>(null)
  const [loopEnabled, setLoopEnabled] = useState(false)
  const engine = getAudioEngine()
  const bpm = effectiveBpm(deck.bpm, deck.pitchPercent)

  useEffect(() => {
    if (!loopEnabled || !loopRange || deck.currentTime < loopRange.end) return
    engine.seek(deckId, loopRange.start)
    setDeckTime(deckId, loopRange.start)
  }, [deck.currentTime, deckId, engine, loopEnabled, loopRange, setDeckTime])

  const quantizedPlayhead = () => quantizeEnabled
    ? quantizeTime(deck.currentTime, bpm, deck.beatOffsetSeconds)
    : deck.currentTime

  const jumpTo = (time: number) => {
    engine.seek(deckId, time)
    setDeckTime(deckId, time)
  }

  const toggleLoop = () => {
    if (loopEnabled) {
      setLoopEnabled(false)
      return
    }
    const nextRange = createLoopRange(quantizedPlayhead(), deck.duration, deck.loopBeats, bpm)
    if (!nextRange) return
    setLoopRange(nextRange)
    setLoopEnabled(true)
  }

  return (
    <section className="cue-loop-panel" aria-label={`Cue and loop deck ${deckId}`}>
      <div className="cue-loop-row">
        <button type="button" aria-label={`Set cue point deck ${deckId}`} disabled={!deck.trackName} onClick={() => setDeckCuePoint(deckId, quantizedPlayhead())}><Flag size={14} /> CUE</button>
        <button type="button" aria-label={`Return to cue point deck ${deckId}`} disabled={deck.cuePoint === null} onClick={() => deck.cuePoint !== null && jumpTo(deck.cuePoint)}><CornerDownLeft size={14} /> {deck.cuePoint === null ? '--:--' : formatTime(deck.cuePoint)}</button>
        <div className="loop-size-row" aria-label={`Loop size deck ${deckId}`}>
          {LOOP_BEAT_OPTIONS.map((beats) => (
            <button key={beats} type="button" className={deck.loopBeats === beats ? 'active' : ''} aria-pressed={deck.loopBeats === beats} aria-label={`${beats} beat loop deck ${deckId}`} onClick={() => setDeckLoopBeats(deckId, beats as LoopBeats)}>{beats}</button>
          ))}
        </div>
        <button type="button" className={`loop-toggle${loopEnabled ? ' active' : ''}`} aria-label={`Loop deck ${deckId}`} aria-pressed={loopEnabled} disabled={!deck.trackName || bpm <= 0 || deck.duration <= 0} onClick={toggleLoop}><Repeat2 size={15} /> {loopEnabled ? 'ON' : 'LOOP'}</button>
      </div>
      <small>{bpm <= 0 ? 'BPM required for beat loop' : loopRange ? `${formatTime(loopRange.start)} – ${formatTime(loopRange.end)}` : `${deck.loopBeats} beat loop · ${quantizeEnabled ? 'quantized' : 'free'}`}</small>
    </section>
  )
}
