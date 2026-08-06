import { beatDurationSeconds } from './phaseSync'

export const BEAT_JUMP_OPTIONS = [1, 4, 8, 16] as const
export type BeatJumpBeats = (typeof BEAT_JUMP_OPTIONS)[number]
export type BeatJumpDirection = -1 | 1

export type BeatJumpLoopRange = {
  start: number
  end: number
}

export function beatJumpDeltaSeconds(
  beats: number,
  direction: BeatJumpDirection,
  baseBpm: number,
): number {
  const beatDuration = beatDurationSeconds(baseBpm)
  if (beatDuration <= 0 || !Number.isFinite(beats) || beats <= 0) return 0
  return beatDuration * beats * direction
}

export function clampBeatJumpTime(currentTime: number, deltaSeconds: number, durationSeconds: number): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return 0
  const current = Number.isFinite(currentTime) ? currentTime : 0
  const delta = Number.isFinite(deltaSeconds) ? deltaSeconds : 0
  return Math.min(durationSeconds, Math.max(0, current + delta))
}

export function shiftLoopRange(
  range: BeatJumpLoopRange,
  deltaSeconds: number,
  durationSeconds: number,
): BeatJumpLoopRange | null {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return null
  const start = Math.min(durationSeconds, Math.max(0, Number.isFinite(range.start) ? range.start : 0))
  const end = Math.min(durationSeconds, Math.max(start, Number.isFinite(range.end) ? range.end : start))
  const length = end - start
  if (length <= 0) return null

  const maxStart = Math.max(0, durationSeconds - length)
  const requestedStart = start + (Number.isFinite(deltaSeconds) ? deltaSeconds : 0)
  const nextStart = Math.min(maxStart, Math.max(0, requestedStart))
  return { start: nextStart, end: nextStart + length }
}

export function movePlayheadWithLoop(
  currentTime: number,
  previousRange: BeatJumpLoopRange,
  nextRange: BeatJumpLoopRange,
): number {
  const previousLength = Math.max(0, previousRange.end - previousRange.start)
  const relative = Math.min(
    previousLength,
    Math.max(0, (Number.isFinite(currentTime) ? currentTime : previousRange.start) - previousRange.start),
  )
  return Math.min(nextRange.end, nextRange.start + relative)
}
