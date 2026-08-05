export const LOOP_BEAT_OPTIONS = [1, 2, 4, 8, 16] as const
export type LoopBeats = (typeof LOOP_BEAT_OPTIONS)[number]

export function clampTime(value: number, duration: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(duration) || duration <= 0) return 0
  return Math.min(duration, Math.max(0, value))
}

export function loopDurationSeconds(beats: number, bpm: number): number {
  if (!Number.isFinite(beats) || beats <= 0) return 0
  if (!Number.isFinite(bpm) || bpm <= 0) return 0
  return beats * (60 / bpm)
}

export function createLoopRange(start: number, duration: number, beats: number, bpm: number) {
  const safeStart = clampTime(start, duration)
  const loopDuration = loopDurationSeconds(beats, bpm)
  if (loopDuration <= 0 || duration <= 0) return null

  const end = Math.min(duration, safeStart + loopDuration)
  if (end <= safeStart) return null

  return { start: safeStart, end }
}

export function shouldWrapLoop(currentTime: number, enabled: boolean, start: number, end: number): boolean {
  return enabled && Number.isFinite(currentTime) && end > start && currentTime >= end
}
