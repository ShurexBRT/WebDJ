const FULL_ROTATION_RADIANS = Math.PI * 2

export function pointerAngle(
  centerX: number,
  centerY: number,
  clientX: number,
  clientY: number,
): number {
  if (![centerX, centerY, clientX, clientY].every(Number.isFinite)) return 0
  return Math.atan2(clientY - centerY, clientX - centerX)
}

export function shortestAngularDelta(previousAngle: number, nextAngle: number): number {
  if (!Number.isFinite(previousAngle) || !Number.isFinite(nextAngle)) return 0
  let delta = (nextAngle - previousAngle) % FULL_ROTATION_RADIANS
  if (delta > Math.PI) delta -= FULL_ROTATION_RADIANS
  if (delta < -Math.PI) delta += FULL_ROTATION_RADIANS
  return delta
}

export function scrubSecondsFromAngle(deltaAngle: number, secondsPerRotation = 4): number {
  if (!Number.isFinite(deltaAngle) || !Number.isFinite(secondsPerRotation) || secondsPerRotation <= 0) return 0
  return (deltaAngle / FULL_ROTATION_RADIANS) * secondsPerRotation
}

export function clampJogSeek(currentTime: number, deltaSeconds: number, durationSeconds: number): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return 0
  const current = Number.isFinite(currentTime) ? currentTime : 0
  const delta = Number.isFinite(deltaSeconds) ? deltaSeconds : 0
  return Math.min(durationSeconds, Math.max(0, current + delta))
}

export function jogRateMultiplierFromMotion(
  deltaAngle: number,
  elapsedMilliseconds: number,
  strength = 0.35,
): number {
  if (!Number.isFinite(deltaAngle) || !Number.isFinite(elapsedMilliseconds) || elapsedMilliseconds <= 0) return 1
  const elapsedSeconds = elapsedMilliseconds / 1_000
  const revolutionsPerSecond = (deltaAngle / FULL_ROTATION_RADIANS) / elapsedSeconds
  const safeStrength = Number.isFinite(strength) ? Math.max(0, strength) : 0.35
  return Math.min(1.5, Math.max(0.5, 1 + revolutionsPerSecond * safeStrength))
}
