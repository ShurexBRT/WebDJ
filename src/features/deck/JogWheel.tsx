import { Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import {
  clampJogSeek,
  jogRateMultiplierFromMotion,
  pointerAngle,
  scrubSecondsFromAngle,
  shortestAngularDelta,
} from '../../audio/jog'
import { phaseLabel, type NudgeDirection } from '../../audio/phaseSync'
import { formatTime } from '../../audio/transport'
import type { DeckId } from '../../state/mixerStore'

type JogInteraction =
  | { mode: 'bend'; multiplier: number }
  | { mode: 'scrub'; time: number }
  | null

type PointerState = {
  pointerId: number
  angle: number
  timestamp: number
  position: number
  mode: 'bend' | 'scrub'
}

type JogWheelProps = {
  deckId: DeckId
  hasTrack: boolean
  currentTime: number
  duration: number
  isPlaying: boolean
  gridBpm: number
  pitchPercent: number
  phaseError: number
  showPhase: boolean
  onTogglePlayback: () => void | Promise<void>
  onScrub: (time: number) => void
  onJogRate: (multiplier: number) => void
  onJogRelease: () => void
  onNudge: (direction: NudgeDirection) => void
}

const SCRUB_SECONDS_PER_ROTATION = 4

function formatDetailedTime(seconds: number): string {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0)
  const wholeMinutes = Math.floor(safe / 60)
  const remaining = safe - wholeMinutes * 60
  return `${wholeMinutes}:${remaining.toFixed(1).padStart(4, '0')}`
}

export function JogWheel({
  deckId,
  hasTrack,
  currentTime,
  duration,
  isPlaying,
  gridBpm,
  pitchPercent,
  phaseError,
  showPhase,
  onTogglePlayback,
  onScrub,
  onJogRate,
  onJogRelease,
  onNudge,
}: JogWheelProps) {
  const pointerState = useRef<PointerState | null>(null)
  const keyboardTimer = useRef<number | null>(null)
  const [interaction, setInteraction] = useState<JogInteraction>(null)

  const clearKeyboardTimer = () => {
    if (keyboardTimer.current === null) return
    window.clearTimeout(keyboardTimer.current)
    keyboardTimer.current = null
  }

  const resetInteractionSoon = (delay = 420) => {
    clearKeyboardTimer()
    keyboardTimer.current = window.setTimeout(() => {
      setInteraction(null)
      keyboardTimer.current = null
    }, delay)
  }

  useEffect(() => () => {
    if (keyboardTimer.current !== null) window.clearTimeout(keyboardTimer.current)
    onJogRelease()
  }, [onJogRelease])

  const finishPointerInteraction = (element: HTMLElement, pointerId: number) => {
    const state = pointerState.current
    if (!state || state.pointerId !== pointerId) return
    if (state.mode === 'bend') onJogRelease()
    pointerState.current = null
    setInteraction(null)
    if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId)
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!hasTrack || event.button !== 0) return
    clearKeyboardTimer()
    const rect = event.currentTarget.getBoundingClientRect()
    const angle = pointerAngle(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      event.clientX,
      event.clientY,
    )
    const mode = isPlaying ? 'bend' : 'scrub'
    pointerState.current = {
      pointerId: event.pointerId,
      angle,
      timestamp: event.timeStamp,
      position: currentTime,
      mode,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setInteraction(mode === 'bend' ? { mode, multiplier: 1 } : { mode, time: currentTime })
    event.preventDefault()
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = pointerState.current
    if (!state || state.pointerId !== event.pointerId) return

    const rect = event.currentTarget.getBoundingClientRect()
    const nextAngle = pointerAngle(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      event.clientX,
      event.clientY,
    )
    const deltaAngle = shortestAngularDelta(state.angle, nextAngle)
    const elapsed = Math.max(1, event.timeStamp - state.timestamp)

    if (state.mode === 'bend') {
      const multiplier = jogRateMultiplierFromMotion(deltaAngle, elapsed)
      onJogRate(multiplier)
      setInteraction({ mode: 'bend', multiplier })
    } else {
      const deltaSeconds = scrubSecondsFromAngle(deltaAngle, SCRUB_SECONDS_PER_ROTATION)
      state.position = clampJogSeek(state.position, deltaSeconds, duration)
      onScrub(state.position)
      setInteraction({ mode: 'scrub', time: state.position })
    }

    state.angle = nextAngle
    state.timestamp = event.timeStamp
    event.preventDefault()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!hasTrack) return

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const direction: NudgeDirection = event.key === 'ArrowRight' ? 1 : -1
      if (isPlaying) {
        onNudge(direction)
        setInteraction({ mode: 'bend', multiplier: direction > 0 ? 1.04 : 0.96 })
      } else {
        const time = clampJogSeek(currentTime, direction * 0.25, duration)
        onScrub(time)
        setInteraction({ mode: 'scrub', time })
      }
      resetInteractionSoon()
      event.preventDefault()
      return
    }

    if (!isPlaying && (event.key === 'Home' || event.key === 'End')) {
      const time = event.key === 'Home' ? 0 : duration
      onScrub(time)
      setInteraction({ mode: 'scrub', time })
      resetInteractionSoon()
      event.preventDefault()
    }
  }

  const interactionLabel = interaction?.mode === 'bend'
    ? `JOG ${interaction.multiplier >= 1 ? '+' : ''}${Math.round((interaction.multiplier - 1) * 100)}%`
    : interaction?.mode === 'scrub'
      ? `SCRUB ${formatDetailedTime(interaction.time)}`
      : `${pitchPercent > 0 ? '+' : ''}${pitchPercent.toFixed(1)}%`

  const valueText = interaction?.mode === 'bend'
    ? `Jog pitch bend ${Math.round((interaction.multiplier - 1) * 100)} percent`
    : interaction?.mode === 'scrub'
      ? `Scrub position ${formatDetailedTime(interaction.time)}`
      : `${formatDetailedTime(currentTime)}, ${isPlaying ? 'playing' : 'paused'}, ${pitchPercent.toFixed(1)} percent pitch`

  return (
    <div
      className={`jog-wheel${interaction ? ` jog-active jog-${interaction.mode}` : ''}`}
      data-testid={`jog-wheel-${deckId}`}
    >
      <div
        className="jog-touch-surface"
        role="slider"
        tabIndex={hasTrack ? 0 : -1}
        aria-label={`Jog wheel deck ${deckId}`}
        aria-valuemin={0}
        aria-valuemax={Math.max(0, duration)}
        aria-valuenow={Math.min(Math.max(0, currentTime), Math.max(0, duration))}
        aria-valuetext={valueText}
        aria-disabled={!hasTrack}
        aria-keyshortcuts="ArrowLeft ArrowRight Home End"
        title={isPlaying ? 'Drag to bend playback speed. Release to restore pitch.' : 'Drag to scrub through the loaded track.'}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => finishPointerInteraction(event.currentTarget, event.pointerId)}
        onPointerCancel={(event) => finishPointerInteraction(event.currentTarget, event.pointerId)}
        onLostPointerCapture={(event) => {
          const state = pointerState.current
          if (!state || state.pointerId !== event.pointerId) return
          if (state.mode === 'bend') onJogRelease()
          pointerState.current = null
          setInteraction(null)
        }}
        onKeyDown={handleKeyDown}
      >
        <div className="jog-progress-ring" />
        <div className="jog-grooves" />
      </div>

      <button
        className="transport-button"
        onClick={() => { void onTogglePlayback() }}
        disabled={!hasTrack}
        aria-label={`${isPlaying ? 'Pause' : 'Play'} deck ${deckId} platter`}
      >
        {isPlaying ? <Pause /> : <Play />}
      </button>

      <div className="jog-readout" aria-hidden="true">
        <strong>{gridBpm > 0 ? gridBpm.toFixed(2) : '--.--'}</strong>
        <span>{interactionLabel}</span>
      </div>
      <span className="jog-needle" aria-hidden="true" />
      <span className={`phase-readout${Math.abs(phaseError) <= 0.005 && showPhase ? ' locked' : ''}`}>
        {showPhase ? phaseLabel(phaseError) : 'PHASE —'}
      </span>
      <span className="jog-mode-label" aria-hidden="true">{isPlaying ? 'BEND' : 'SCRUB'}</span>
      <span className="sr-only">Current position {formatTime(currentTime)}</span>
    </div>
  )
}
