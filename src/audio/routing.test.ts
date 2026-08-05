import { describe, expect, it } from 'vitest'
import { calculateMonitorGains, normalizeAudioOutputs } from './routing'

describe('cue monitor routing', () => {
  it('routes fully to cue at the left edge', () => {
    expect(calculateMonitorGains(0)).toEqual({ cue: 1, master: 0 })
  })

  it('routes fully to master at the right edge', () => {
    const gains = calculateMonitorGains(1)
    expect(gains.cue).toBeCloseTo(0, 10)
    expect(gains.master).toBeCloseTo(1, 10)
  })

  it('uses equal-power gains in the center', () => {
    const gains = calculateMonitorGains(0.5)
    expect(gains.cue).toBeCloseTo(Math.SQRT1_2, 6)
    expect(gains.master).toBeCloseTo(Math.SQRT1_2, 6)
  })

  it('clamps values outside the supported range', () => {
    expect(calculateMonitorGains(-5)).toEqual({ cue: 1, master: 0 })
    expect(calculateMonitorGains(5).master).toBeCloseTo(1, 10)
  })

  it('keeps only audio output devices and adds fallback labels', () => {
    const devices = [
      { kind: 'audioinput', deviceId: 'mic', label: 'Mic' },
      { kind: 'audiooutput', deviceId: 'default', label: '' },
      { kind: 'audiooutput', deviceId: 'usb', label: 'USB Headphones' },
    ] as MediaDeviceInfo[]

    expect(normalizeAudioOutputs(devices)).toEqual([
      { deviceId: 'default', label: 'System default' },
      { deviceId: 'usb', label: 'USB Headphones' },
    ])
  })
})
