export const MIN_PITCH_PERCENT = -16
export const MAX_PITCH_PERCENT = 16

export function clampPitchPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(MAX_PITCH_PERCENT, Math.max(MIN_PITCH_PERCENT, value))
}

export function playbackRateFromPitch(percent: number): number {
  return 1 + clampPitchPercent(percent) / 100
}

export function effectiveBpm(baseBpm: number, pitchPercent: number): number {
  if (!Number.isFinite(baseBpm) || baseBpm <= 0) return 0
  return baseBpm * playbackRateFromPitch(pitchPercent)
}

export function pitchToMatchBpm(sourceBpm: number, targetBpm: number): number | null {
  if (!Number.isFinite(sourceBpm) || sourceBpm <= 0) return null
  if (!Number.isFinite(targetBpm) || targetBpm <= 0) return null

  return clampPitchPercent((targetBpm / sourceBpm - 1) * 100)
}

export function normalizeBpm(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0
  return Math.round(value * 10) / 10
}
