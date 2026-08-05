import { useEffect, useRef } from 'react'
import { buildBeatGrid } from '../audio/beatGrid'

type WaveformProps = {
  peaks: number[]
  progress: number
  accent: string
  onSeek: (progress: number) => void
  label: string
  duration?: number
  bpm?: number
  beatOffsetSeconds?: number
  barOffsetBeats?: number
}

export function Waveform({
  peaks,
  progress,
  accent,
  onSeek,
  label,
  duration = 0,
  bpm = 0,
  beatOffsetSeconds = 0,
  barOffsetBeats = 0,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    const ratio = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = Math.max(1, Math.floor(rect.width * ratio))
    canvas.height = Math.max(1, Math.floor(rect.height * ratio))
    context.scale(ratio, ratio)
    context.clearRect(0, 0, rect.width, rect.height)

    const center = rect.height / 2
    const barWidth = peaks.length > 0 ? rect.width / peaks.length : 0

    peaks.forEach((peak, index) => {
      const height = Math.max(2, peak * rect.height * 0.86)
      const x = index * barWidth
      const played = index / Math.max(1, peaks.length - 1) <= progress
      context.fillStyle = played ? accent : 'rgba(129, 143, 166, 0.38)'
      context.fillRect(x, center - height / 2, Math.max(1, barWidth - 1), height)
    })

    if (duration > 0 && bpm > 0) {
      const markers = buildBeatGrid(duration, bpm, beatOffsetSeconds, barOffsetBeats)
      markers.forEach((marker) => {
        const x = (marker.time / duration) * rect.width
        context.fillStyle = marker.isBarStart ? accent : 'rgba(255,255,255,0.22)'
        context.fillRect(x, marker.isBarStart ? 0 : rect.height * 0.18, marker.isBarStart ? 2 : 1, marker.isBarStart ? rect.height : rect.height * 0.64)
      })
    }

    if (peaks.length === 0) {
      context.fillStyle = 'rgba(129, 143, 166, 0.28)'
      context.font = '12px system-ui'
      context.textAlign = 'center'
      context.fillText('LOAD A TRACK TO BUILD THE WAVEFORM', rect.width / 2, center + 4)
    }

    const playheadX = Math.max(0, Math.min(1, progress)) * rect.width
    context.fillStyle = '#ffffff'
    context.fillRect(playheadX, 0, 1, rect.height)
  }, [accent, barOffsetBeats, beatOffsetSeconds, bpm, duration, peaks, progress])

  const handlePointer = (clientX: number) => {
    const canvas = canvasRef.current
    if (!canvas || peaks.length === 0) return
    const rect = canvas.getBoundingClientRect()
    onSeek(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)))
  }

  return (
    <canvas
      ref={canvasRef}
      className="waveform-canvas"
      aria-label={label}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      tabIndex={0}
      onPointerDown={(event) => handlePointer(event.clientX)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') onSeek(Math.min(1, progress + 0.01))
        if (event.key === 'ArrowLeft') onSeek(Math.max(0, progress - 0.01))
        if (event.key === 'Home') onSeek(0)
        if (event.key === 'End') onSeek(1)
      }}
    />
  )
}
