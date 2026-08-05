export type CrossfaderGains = {
  a: number
  b: number
}

export function clampCrossfader(value: number): number {
  return Math.min(1, Math.max(-1, value))
}

export function calculateCrossfaderGains(value: number): CrossfaderGains {
  const normalized = (clampCrossfader(value) + 1) / 2

  return {
    a: Math.cos(normalized * Math.PI * 0.5),
    b: Math.sin(normalized * Math.PI * 0.5),
  }
}
