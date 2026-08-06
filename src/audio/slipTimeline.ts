import {
  clampTransportTime,
  reanchorTransportClock,
  transportPositionAt,
  type TransportClock,
} from './bufferTransport'

export type SlipRelease = {
  active: boolean
  returnTime: number | null
}

export class SlipTimeline {
  private clock: TransportClock | null = null
  private readonly owners = new Set<string>()

  begin(
    owner: string,
    audiblePosition: number,
    contextTime: number,
    playbackRate: number,
    durationSeconds: number,
  ): boolean {
    const normalizedOwner = owner.trim()
    if (!normalizedOwner || durationSeconds <= 0 || !Number.isFinite(contextTime)) return false

    if (!this.clock) {
      this.clock = {
        offsetSeconds: clampTransportTime(audiblePosition, durationSeconds),
        anchorContextTime: contextTime,
        playbackRate: Math.max(0.01, playbackRate),
        durationSeconds,
        playing: true,
      }
    }

    this.owners.add(normalizedOwner)
    return true
  }

  setPlaybackRate(contextTime: number, playbackRate: number): void {
    if (!this.clock) return
    this.clock = reanchorTransportClock(this.clock, contextTime, playbackRate)
  }

  end(owner: string, contextTime: number): SlipRelease {
    const removed = this.owners.delete(owner.trim())
    if (!removed || !this.clock) return { active: this.isActive(), returnTime: null }
    if (this.owners.size > 0) return { active: true, returnTime: null }

    const returnTime = transportPositionAt(this.clock, contextTime)
    this.clock = null
    return { active: false, returnTime }
  }

  cancel(contextTime: number, returnToTimeline: boolean): SlipRelease {
    const returnTime = returnToTimeline && this.clock
      ? transportPositionAt(this.clock, contextTime)
      : null
    this.clear()
    return { active: false, returnTime }
  }

  hiddenPositionAt(contextTime: number): number | null {
    return this.clock ? transportPositionAt(this.clock, contextTime) : null
  }

  isActive(): boolean {
    return Boolean(this.clock && this.owners.size > 0)
  }

  hasOwner(owner: string): boolean {
    return this.owners.has(owner.trim())
  }

  clear(): void {
    this.clock = null
    this.owners.clear()
  }
}
