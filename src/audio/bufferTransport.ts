export type TransportClock = {
  offsetSeconds: number
  anchorContextTime: number
  playbackRate: number
  durationSeconds: number
  playing: boolean
}

export type TransportLoopRange = {
  startSeconds: number
  endSeconds: number
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

export function loopedTransportPositionAt(
  clock: TransportClock,
  contextTime: number,
  loopRange: TransportLoopRange | null,
): number {
  const offset = clampTransportTime(clock.offsetSeconds, clock.durationSeconds)
  if (!clock.playing || !Number.isFinite(contextTime)) return offset

  const elapsed = Math.max(0, contextTime - clock.anchorContextTime)
  const rawPosition = offset + elapsed * Math.max(0.01, clock.playbackRate)
  if (!loopRange) return clampTransportTime(rawPosition, clock.durationSeconds)

  const start = clampTransportTime(loopRange.startSeconds, clock.durationSeconds)
  const end = clampTransportTime(loopRange.endSeconds, clock.durationSeconds)
  const length = end - start
  if (length <= 0 || rawPosition < end) return clampTransportTime(rawPosition, clock.durationSeconds)

  return start + ((rawPosition - start) % length)
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
