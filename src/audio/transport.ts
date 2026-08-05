export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00'
  const minutes = Math.floor(seconds / 60)
  const remainder = Math.floor(seconds % 60)
  return `${minutes.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`
}

export function progressFromTime(currentTime: number, duration: number): number {
  if (!Number.isFinite(currentTime) || !Number.isFinite(duration) || duration <= 0) return 0
  return Math.max(0, Math.min(1, currentTime / duration))
}

export function timeFromProgress(progress: number, duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) return 0
  return Math.max(0, Math.min(1, progress)) * duration
}
