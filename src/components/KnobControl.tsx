import type { CSSProperties } from 'react'

type KnobControlProps = {
  label: string
  ariaLabel: string
  value: number
  min: number
  max: number
  step: number
  accent?: string
  valueLabel?: string
  onChange: (value: number) => void
  onDoubleClick?: () => void
}

export function KnobControl({
  label,
  ariaLabel,
  value,
  min,
  max,
  step,
  accent = '#29b6ff',
  valueLabel,
  onChange,
  onDoubleClick,
}: KnobControlProps) {
  const ratio = max === min ? 0 : (value - min) / (max - min)
  const angle = -135 + Math.max(0, Math.min(1, ratio)) * 270
  const style = {
    '--knob-angle': `${angle}deg`,
    '--knob-accent': accent,
  } as CSSProperties

  return (
    <label className="knob-control" style={style}>
      <span className="knob-label">{label}</span>
      <span className="knob-shell" aria-hidden="true">
        <span className="knob-marker" />
      </span>
      <input
        className="knob-input"
        aria-label={ariaLabel}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onDoubleClick={onDoubleClick}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className="knob-value">{valueLabel ?? value}</span>
    </label>
  )
}
