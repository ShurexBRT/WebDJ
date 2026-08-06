import { describe, expect, it } from 'vitest'
import { clampTransportTime, isTransportEnded, reanchorTransportClock, transportPositionAt, type TransportClock } from './bufferTransport'

const clock = (patch: Partial<TransportClock> = {}): TransportClock => ({
  offsetSeconds: 12,
  anchorContextTime: 100,
  playbackRate: 1,
  durationSeconds: 180,
  playing: true,
  ...patch,
})

describe('buffer transport clock', () => {
  it('derives playhead time from the AudioContext clock', () => {
    expect(transportPositionAt(clock(), 100)).toBe(12)
    expect(transportPositionAt(clock(), 103.5)).toBe(15.5)
    expect(transportPositionAt(clock({ playbackRate: 1.25 }), 104)).toBe(17)
  })

  it('reanchors without jumping when playback rate changes', () => {
    const reanchored = reanchorTransportClock(clock(), 104, 1.1)
    expect(reanchored).toMatchObject({
      offsetSeconds: 16,
      anchorContextTime: 104,
      playbackRate: 1.1,
    })
    expect(transportPositionAt(reanchored, 105)).toBeCloseTo(17.1, 8)
  })

  it('clamps seeks and detects the end with a small audio epsilon', () => {
    expect(clampTransportTime(-2, 20)).toBe(0)
    expect(clampTransportTime(25, 20)).toBe(20)
    expect(isTransportEnded(clock({ offsetSeconds: 179, anchorContextTime: 10 }), 11)).toBe(true)
    expect(isTransportEnded(clock({ playing: false, offsetSeconds: 180 }), 11)).toBe(false)
  })
})
