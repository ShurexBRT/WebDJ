import { useEffect, useState } from 'react'
import { CornerDownLeft, Flag, Repeat2 } from 'lucide-react'
import { getAudioEngine } from '../audio/AudioEngine'
import { createLoopRange, LOOP_BEAT_OPTIONS, type LoopBeats } from '../audio/loop'
import { effectiveBpm } from '../audio/tempo'
import { formatTime } from '../audio/transport'
import { useMixerStore, type DeckId } from '../state/mixerStore'
import './cueLoop.css'

export function CueLoopControls({ deckId }: { deckId: DeckId }) {
  const deck = useMixerStore((state) => state.decks[deckId])
  const setDeckTime = useMixerStore((state) => state.setDeckTime)
  const [cuePoint, setCuePoint] = useState<number | null>(null)
  const [loopBeats, setLoopBeats] = useState<LoopBeats>(4)
  const [loopRange, setLoopRange] = useState<{ start: number; end: number } | null>(null)
  const [loopEnabled, setLoopEnabled] = useState(false)
  const engine = getAudioEngine()
  const bpm = effectiveBpm(deck.bpm, deck.pitchPercent)

  useEffect(() => {
    if (!loopEnabled || !loopRange || deck.currentTime < loopRange.end) return
    engine.seek(deckId, loopRange.start)
    setDeckTime(deckId, loopRange.start)
  }, [deck.currentTime, deckId, engine, loopEnabled, loopRange, setDeckTime])

  useEffect(() => {
    setCuePoint(null)
    setLoopRange(null)
    setLoopEnabled(false)
  }, [deck.trackName])

  const jumpTo = (time: number) => {
    engine.seek(deckId, time)
    setDeckTime(deckId, time)
  }

  const toggleLoop = () => {
    if (loopEnabled) {
      setLoopEnabled(false)
      return
    }

    const nextRange = createLoopRange(deck.currentTime, deck.duration, loopBeats, bpm)
    if (!nextRange) return
    setLoopRange(nextRange)
    setLoopEnabled(true)
  }

  return (
    <section className="cue-loop-panel" aria-label={`Cue and loop deck ${deckId}`}>
      <div className="cue-loop-row">
        <button
          type="button"
          aria-label={`Set cue point deck ${deckId}`}
          disabled={!deck.trackName}
          onClick={() => setCuePoint(deck.currentTime)}
        >
          <Flag size={15} /> SET CUE
        </button>
        <button
          type="button"
          aria-label={`Return to cue point deck ${deckId}`}
          disabled={cuePoint === null}
          onClick={() => cuePoint !== null && jumpTo(cuePoint)}
        >
          <CornerDownLeft size={15} /> {cuePoint === null ? '--:--' : formatTime(cuePoint)}
        </button>
      </div>

      <div className="loop-size-row" aria-label={`Loop size deck ${deckId}`}>
        {LOOP_BEAT_OPTIONS.map((beats) => (
          <button
            key={beats}
            type="button"
            className={loopBeats === beats ? 'active' : ''}
            aria-pressed={loopBeats === beats}
            aria-label={`${beats} beat loop deck ${deckId}`}
            onClick={() => setLoopBeats(beats)}
          >
            {beats}
          </button>
        ))}
      </div>

      <button
        type="button"
        className={`loop-toggle${loopEnabled ? ' active' : ''}`}
        aria-label={`Loop deck ${deckId}`}
        aria-pressed={loopEnabled}
        disabled={!deck.trackName || bpm <= 0 || deck.duration <= 0}
        onClick={toggleLoop}
      >
        <Repeat2 size={16} /> {loopEnabled ? 'LOOP ON' : `LOOP ${loopBeats}`}
      </button>
      <small>{bpm <= 0 ? 'BPM required for beat loop' : loopRange ? `${formatTime(loopRange.start)} – ${formatTime(loopRange.end)}` : 'Loop starts at playhead'}</small>
    </section>
  )
}
