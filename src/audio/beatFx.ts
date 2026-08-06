export const ECHO_BEAT_DIVISIONS = ['1/4', '1/2', '1', '2', '4'] as const
export type EchoBeatDivision = typeof ECHO_BEAT_DIVISIONS[number]

const DIVISION_MULTIPLIERS: Record<EchoBeatDivision, number> = {
  '1/4': 0.25,
  '1/2': 0.5,
  '1': 1,
  '2': 2,
  '4': 4,
}

export function echoDelayMsFromBpm(
  bpm: number,
  division: EchoBeatDivision,
  maxDelayMs = 3_900,
): number | null {
  if (!Number.isFinite(bpm) || bpm <= 0) return null
  const delayMs = (60_000 / bpm) * DIVISION_MULTIPLIERS[division]
  return Math.round(Math.min(maxDelayMs, Math.max(25, delayMs)))
}

export function formatEchoDivision(division: EchoBeatDivision): string {
  return `${division} beat`
}
