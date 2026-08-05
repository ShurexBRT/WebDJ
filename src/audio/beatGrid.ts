export type BeatMarker = {
  time: number
  beatNumber: number
  beatInBar: number
  isBarStart: boolean
}

export function beatIntervalSeconds(bpm: number): number | null {
  if (!Number.isFinite(bpm) || bpm <= 0) return null
  return 60 / bpm
}

export function normalizeBeatOffset(offsetSeconds: number, bpm: number): number {
  const interval = beatIntervalSeconds(bpm)
  if (!interval || !Number.isFinite(offsetSeconds)) return 0
  const wrapped = ((offsetSeconds % interval) + interval) % interval
  return Number(wrapped.toFixed(4))
}

export function normalizeBarOffset(offsetBeats: number): number {
  if (!Number.isFinite(offsetBeats)) return 0
  return ((Math.round(offsetBeats) % 4) + 4) % 4
}

export function buildBeatGrid(duration: number, bpm: number, offsetSeconds = 0, barOffsetBeats = 0): BeatMarker[] {
  const interval = beatIntervalSeconds(bpm)
  if (!interval || !Number.isFinite(duration) || duration <= 0) return []

  const offset = normalizeBeatOffset(offsetSeconds, bpm)
  const downbeat = normalizeBarOffset(barOffsetBeats)
  const markers: BeatMarker[] = []
  let beatNumber = 0

  for (let time = offset; time <= duration + 0.0001; time += interval) {
    const beatInBar = ((beatNumber - downbeat) % 4 + 4) % 4
    markers.push({
      time: Number(time.toFixed(4)),
      beatNumber,
      beatInBar,
      isBarStart: beatInBar === 0,
    })
    beatNumber += 1
  }

  return markers
}
