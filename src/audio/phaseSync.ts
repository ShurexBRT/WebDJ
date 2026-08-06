import type { DeckId } from '../state/mixerStore'

export type NudgeDirection = -1 | 1

const positiveModulo = (value: number, divisor: number) => ((value % divisor) + divisor) % divisor

export function beatDurationSeconds(bpm: number): number {
  return Number.isFinite(bpm) && bpm > 0 ? 60 / bpm : 0
}

export function beatPhase(timeSeconds: number, bpm: number, beatOffsetSeconds = 0): number {
  const beatDuration = beatDurationSeconds(bpm)
  if (beatDuration <= 0 || !Number.isFinite(timeSeconds)) return 0
  return positiveModulo(timeSeconds - beatOffsetSeconds, beatDuration) / beatDuration
}

export function signedPhaseErrorSeconds(
  targetTime: number,
  targetBpm: number,
  targetOffset: number,
  referenceTime: number,
  referenceBpm: number,
  referenceOffset: number,
): number {
  const targetBeatDuration = beatDurationSeconds(targetBpm)
  if (targetBeatDuration <= 0 || beatDurationSeconds(referenceBpm) <= 0) return 0

  const targetPhase = beatPhase(targetTime, targetBpm, targetOffset)
  const referencePhase = beatPhase(referenceTime, referenceBpm, referenceOffset)
  let phaseDelta = referencePhase - targetPhase
  if (phaseDelta > 0.5) phaseDelta -= 1
  if (phaseDelta < -0.5) phaseDelta += 1
  return phaseDelta * targetBeatDuration
}

export function phaseAlignedTime(
  targetTime: number,
  targetBpm: number,
  targetOffset: number,
  referenceTime: number,
  referenceBpm: number,
  referenceOffset: number,
): number {
  const correction = signedPhaseErrorSeconds(
    targetTime,
    targetBpm,
    targetOffset,
    referenceTime,
    referenceBpm,
    referenceOffset,
  )
  return Math.max(0, targetTime + correction)
}

export function nextBeatContextTime(
  referenceTrackTime: number,
  referenceBaseBpm: number,
  referenceEffectiveBpm: number,
  referenceOffset: number,
  contextTime: number,
  minimumLeadSeconds = 0.04,
): number {
  const effectiveBeatDuration = beatDurationSeconds(referenceEffectiveBpm)
  if (effectiveBeatDuration <= 0 || beatDurationSeconds(referenceBaseBpm) <= 0 || !Number.isFinite(contextTime)) {
    return Math.max(0, contextTime || 0)
  }

  const phase = beatPhase(referenceTrackTime, referenceBaseBpm, referenceOffset)
  let delay = (1 - phase) * effectiveBeatDuration
  const safeLead = Math.max(0, minimumLeadSeconds)
  if (delay < safeLead) delay += effectiveBeatDuration
  return Math.max(0, contextTime + delay)
}

export function quantizeTime(
  timeSeconds: number,
  bpm: number,
  beatOffsetSeconds = 0,
  subdivision = 1,
): number {
  const beatDuration = beatDurationSeconds(bpm)
  if (beatDuration <= 0 || subdivision <= 0 || !Number.isFinite(timeSeconds)) return Math.max(0, timeSeconds || 0)
  const gridDuration = beatDuration / subdivision
  const gridIndex = Math.round((timeSeconds - beatOffsetSeconds) / gridDuration)
  return Math.max(0, beatOffsetSeconds + gridIndex * gridDuration)
}

export function nudgePlaybackRate(baseRate: number, direction: NudgeDirection, amountPercent = 4): number {
  const safeBaseRate = Number.isFinite(baseRate) && baseRate > 0 ? baseRate : 1
  const safeAmount = Math.min(12, Math.max(0, amountPercent)) / 100
  return safeBaseRate * (1 + direction * safeAmount)
}

export function phaseLabel(errorSeconds: number): string {
  if (!Number.isFinite(errorSeconds)) return '—'
  const milliseconds = Math.round(errorSeconds * 1000)
  if (Math.abs(milliseconds) <= 5) return 'LOCKED'
  return `${milliseconds > 0 ? '+' : ''}${milliseconds} ms`
}

export function otherDeck(deckId: DeckId): DeckId {
  return deckId === 'A' ? 'B' : 'A'
}
