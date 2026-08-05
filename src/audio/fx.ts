export function clampFxMix(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

export function filterFrequencyFromPosition(position: number): number {
  const safe = Math.min(1, Math.max(-1, position))
  if (safe === 0) return 20_000
  if (safe < 0) {
    const amount = Math.abs(safe)
    return 20_000 * Math.pow(80 / 20_000, amount)
  }
  return 20 + (20_000 - 20) * Math.pow(safe, 2)
}

export function delaySecondsFromMs(milliseconds: number): number {
  if (!Number.isFinite(milliseconds)) return 0.25
  return Math.min(1.5, Math.max(0.05, milliseconds / 1000))
}

export function feedbackGain(value: number): number {
  return Math.min(0.85, Math.max(0, value))
}
