import { useEffect, useRef } from 'react'
import { clampLevel } from '../audio/meter'

type LevelMeterProps = {
  label: string
  readLevel: () => number
}

export function LevelMeter({ label, readLevel }: LevelMeterProps) {
  const fillRef = useRef<HTMLDivElement>(null)
  const peakRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let frame = 0
    let displayed = 0
    let peakHold = 0

    const draw = () => {
      const level = clampLevel(readLevel())
      displayed = level > displayed ? level : displayed * 0.91
      peakHold = level > peakHold ? level : peakHold * 0.985

      if (fillRef.current) fillRef.current.style.transform = `scaleY(${displayed})`
      if (peakRef.current) peakRef.current.style.bottom = `${peakHold * 100}%`
      frame = window.requestAnimationFrame(draw)
    }

    frame = window.requestAnimationFrame(draw)
    return () => window.cancelAnimationFrame(frame)
  }, [readLevel])

  return (
    <div className="level-meter" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={1}>
      <div className="level-meter-track">
        <div ref={fillRef} className="level-meter-fill" />
        <span ref={peakRef} className="level-meter-peak" />
      </div>
    </div>
  )
}
