export function clampLevel(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

export function rmsFromTimeDomain(samples: ArrayLike<number>): number {
  if (samples.length === 0) return 0

  let sum = 0
  for (let index = 0; index < samples.length; index += 1) {
    const normalized = (samples[index] - 128) / 128
    sum += normalized * normalized
  }

  return Math.sqrt(sum / samples.length)
}

export function levelFromRms(rms: number): number {
  if (rms <= 0 || !Number.isFinite(rms)) return 0
  const db = 20 * Math.log10(rms)
  return clampLevel((db + 60) / 60)
}

export function readAnalyserLevel(analyser: AnalyserNode, buffer: Uint8Array): number {
  analyser.getByteTimeDomainData(buffer as Uint8Array<ArrayBuffer>)
  return levelFromRms(rmsFromTimeDomain(buffer))
}

export function decibelsToGain(decibels: number): number {
  const safe = Math.min(12, Math.max(-12, decibels))
  return 10 ** (safe / 20)
}
