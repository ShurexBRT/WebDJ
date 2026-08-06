import { useRef } from 'react'
import { ChevronLeft, ChevronRight, CornerDownLeft, Flag, Repeat2, Waves } from 'lucide-react'
import { getAudioEngine } from '../audio/AudioEngine'
import {
  BEAT_JUMP_OPTIONS,
  beatJumpDeltaSeconds,
  clampBeatJumpTime,
  movePlayheadWithLoop,
  shiftLoopRange,
  type BeatJumpDirection,
} from '../audio/beatJump'
import { createLoopRange, LOOP_BEAT_OPTIONS, type LoopBeats } from '../audio/loop'
import { quantizeTime } from '../audio/phaseSync'
import { beginDeckSlip, cancelDeckSlip, endDeckSlip, isDeckSlipActive } from '../audio/slipEngine'
import { formatTime } from '../audio/transport'
import {
  useMixerStore,
  type BeatJumpBeats,
  type DeckId,
  type DeckLoopRange,
} from '../state/mixerStore'
import { useSlipStore } from '../state/slipStore'
import './cueLoop.css'

const LOOP_SLIP_OWNER = 'loop'
const BEAT_JUMP_SLIP_OWNER = 'beat-jump'

export function CueLoopControls({ deckId }: { deckId: DeckId }) {
  const deck = useMixerStore((state) => state.decks[deckId])
  const quantizeEnabled = useMixerStore((state) => state.quantizeEnabled)
  const setDeckTime = useMixerStore((state) => state.setDeckTime)
  const setDeckCuePoint = useMixerStore((state) => state.setDeckCuePoint)
  const setDeckLoopBeats = useMixerStore((state) => state.setDeckLoopBeats)
  const setDeckLoopRange = useMixerStore((state) => state.setDeckLoopRange)
  const setDeckBeatJumpBeats = useMixerStore((state) => state.setDeckBeatJumpBeats)
  const slipEnabled = useSlipStore((state) => state.enabled[deckId])
  const slipActive = useSlipStore((state) => state.active[deckId])
  const setSlipEnabled = useSlipStore((state) => state.setEnabled)
  const setSlipActive = useSlipStore((state) => state.setActive)
  const beatJumpHandledRef = useRef(false)
  const engine = getAudioEngine()
  const loopRange = deck.loopRange
  const loopEnabled = Boolean(loopRange)
  const canBeatJump = Boolean(deck.trackName && deck.bpm > 0 && deck.duration > 0)

  const exactPlayhead = () => engine.getDeckCurrentTime(deckId) || deck.currentTime

  const quantizedPlayhead = () => {
    const playhead = exactPlayhead()
    return quantizeEnabled
      ? quantizeTime(playhead, deck.bpm, deck.beatOffsetSeconds)
      : playhead
  }

  const jumpTo = (time: number) => {
    engine.seek(deckId, time)
    setDeckTime(deckId, time)
  }

  const refreshSlipActive = () => setSlipActive(deckId, isDeckSlipActive(engine, deckId))

  const beginSlip = (owner: string) => {
    if (!slipEnabled || !deck.isPlaying) return false
    const started = beginDeckSlip(engine, deckId, owner)
    refreshSlipActive()
    return started
  }

  const endSlip = (owner: string) => {
    const returnTime = endDeckSlip(engine, deckId, owner)
    refreshSlipActive()
    if (returnTime !== null) setDeckTime(deckId, returnTime)
  }

  const toggleSlip = () => {
    const nextEnabled = !slipEnabled
    if (!nextEnabled) {
      cancelDeckSlip(engine, deckId, false)
      setSlipActive(deckId, false)
    }
    setSlipEnabled(deckId, nextEnabled)
  }

  const applyLoopRange = (range: DeckLoopRange | null) => {
    setDeckLoopRange(deckId, range)
    engine.setDeckLoop(deckId, range)
  }

  const selectLoopSize = (beats: LoopBeats) => {
    setDeckLoopBeats(deckId, beats)
    if (!loopRange) return
    applyLoopRange(createLoopRange(loopRange.start, deck.duration, beats, deck.bpm))
  }

  const toggleLoop = () => {
    if (loopRange) {
      applyLoopRange(null)
      endSlip(LOOP_SLIP_OWNER)
      return
    }

    const nextRange = createLoopRange(quantizedPlayhead(), deck.duration, deck.loopBeats, deck.bpm)
    if (!nextRange) return
    beginSlip(LOOP_SLIP_OWNER)
    applyLoopRange(nextRange)
  }

  const jumpBeats = (direction: BeatJumpDirection) => {
    if (!canBeatJump) return
    const currentTime = exactPlayhead()
    const deltaSeconds = beatJumpDeltaSeconds(deck.beatJumpBeats, direction, deck.bpm)

    if (loopRange) {
      const nextRange = shiftLoopRange(loopRange, deltaSeconds, deck.duration)
      if (!nextRange) return
      const nextTime = movePlayheadWithLoop(currentTime, loopRange, nextRange)
      engine.setDeckLoop(deckId, null)
      engine.seek(deckId, nextTime)
      engine.setDeckLoop(deckId, nextRange)
      setDeckLoopRange(deckId, nextRange)
      setDeckTime(deckId, nextTime)
      return
    }

    jumpTo(clampBeatJumpTime(currentTime, deltaSeconds, deck.duration))
  }

  const beginBeatJump = (direction: BeatJumpDirection) => {
    if (!slipEnabled || !deck.isPlaying) return false
    beatJumpHandledRef.current = true
    beginSlip(BEAT_JUMP_SLIP_OWNER)
    jumpBeats(direction)
    return true
  }

  const releaseBeatJump = () => {
    if (!beatJumpHandledRef.current) return
    endSlip(BEAT_JUMP_SLIP_OWNER)
  }

  const beatJumpButtonHandlers = (direction: BeatJumpDirection) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return
      beginBeatJump(direction)
    },
    onPointerUp: releaseBeatJump,
    onPointerCancel: () => {
      releaseBeatJump()
      beatJumpHandledRef.current = false
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return
      if (beginBeatJump(direction)) event.preventDefault()
    },
    onKeyUp: (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      releaseBeatJump()
    },
    onClick: () => {
      if (beatJumpHandledRef.current) {
        beatJumpHandledRef.current = false
        return
      }
      jumpBeats(direction)
    },
  })

  return (
    <section className={`cue-loop-panel${slipActive ? ' slip-active' : ''}`} aria-label={`Cue and loop deck ${deckId}`}>
      <div className="cue-loop-row">
        <button type="button" aria-label={`Set cue point deck ${deckId}`} disabled={!deck.trackName} onClick={() => setDeckCuePoint(deckId, quantizedPlayhead())}><Flag size={14} /> CUE</button>
        <button type="button" aria-label={`Return to cue point deck ${deckId}`} disabled={deck.cuePoint === null} onClick={() => deck.cuePoint !== null && jumpTo(deck.cuePoint)}><CornerDownLeft size={14} /> {deck.cuePoint === null ? '--:--' : formatTime(deck.cuePoint)}</button>
        <div className="loop-size-row" aria-label={`Loop size deck ${deckId}`}>
          {LOOP_BEAT_OPTIONS.map((beats) => (
            <button key={beats} type="button" className={deck.loopBeats === beats ? 'active' : ''} aria-pressed={deck.loopBeats === beats} aria-label={`${beats} beat loop deck ${deckId}`} onClick={() => selectLoopSize(beats as LoopBeats)}>{beats}</button>
          ))}
        </div>
        <button type="button" className={`slip-toggle${slipEnabled ? ' active' : ''}`} aria-label={`Slip mode deck ${deckId}`} aria-pressed={slipEnabled} onClick={toggleSlip}><Waves size={14} /> SLIP</button>
        <button type="button" className={`loop-toggle${loopEnabled ? ' active' : ''}`} aria-label={`Loop deck ${deckId}`} aria-pressed={loopEnabled} disabled={!deck.trackName || deck.bpm <= 0 || deck.duration <= 0} onClick={toggleLoop}><Repeat2 size={15} /> {loopEnabled ? 'ON' : 'LOOP'}</button>
      </div>

      <div className="beat-jump-row" aria-label={`Beat jump deck ${deckId}`}>
        <span>BEAT JUMP</span>
        <button type="button" aria-label={`Beat jump backward deck ${deckId}`} disabled={!canBeatJump} {...beatJumpButtonHandlers(-1)}><ChevronLeft size={13} /></button>
        <div className="beat-jump-size-row" aria-label={`Beat jump size deck ${deckId}`}>
          {BEAT_JUMP_OPTIONS.map((beats) => (
            <button
              key={beats}
              type="button"
              className={deck.beatJumpBeats === beats ? 'active' : ''}
              aria-pressed={deck.beatJumpBeats === beats}
              aria-label={`${beats} beat jump deck ${deckId}`}
              onClick={() => setDeckBeatJumpBeats(deckId, beats as BeatJumpBeats)}
            >
              {beats}
            </button>
          ))}
        </div>
        <button type="button" aria-label={`Beat jump forward deck ${deckId}`} disabled={!canBeatJump} {...beatJumpButtonHandlers(1)}><ChevronRight size={13} /></button>
      </div>

      <small>{slipActive ? 'SLIP ACTIVE · hidden timeline running' : deck.bpm <= 0 ? 'BPM required for loop and beat jump' : loopRange ? `${formatTime(loopRange.start)} – ${formatTime(loopRange.end)} · jump moves loop` : `${deck.loopBeats} beat loop · ${deck.beatJumpBeats} beat jump`}</small>
    </section>
  )
}
