export type TransportClock = {
  offsetSeconds: number
  anchorContextTime: number
  playbackRate: number
  durationSeconds: number
  playing: boolean
}

export function clampTransportTime(value: number, durationSeconds: number): number {
  if (!Number.isFinite(value) || durationSeconds <= 0) return 0
  return Math.min(durationSeconds, Math.max(0, value))
}

export function transportPositionAt(clock: TransportClock, contextTime: number): number {
  const offset = clampTransportTime(clock.offsetSeconds, clock.durationSeconds)
  if (!clock.playing || !Number.isFinite(contextTime)) return offset

  const elapsed = Math.max(0, contextTime - clock.anchorContextTime)
  const advanced = elapsed * Math.max(0.01, clock.playbackRate)
  return clampTransportTime(offset + advanced, clock.durationSeconds)
}

export function reanchorTransportClock(
  clock: TransportClock,
  contextTime: number,
  nextPlaybackRate = clock.playbackRate,
): TransportClock {
  return {
    ...clock,
    offsetSeconds: transportPositionAt(clock, contextTime),
    anchorContextTime: contextTime,
    playbackRate: Math.max(0.01, nextPlaybackRate),
  }
}

export function isTransportEnded(clock: TransportClock, contextTime: number, epsilonSeconds = 0.002): boolean {
  if (!clock.playing || clock.durationSeconds <= 0) return false
  return transportPositionAt(clock, contextTime) >= clock.durationSeconds - Math.max(0, epsilonSeconds)
}
