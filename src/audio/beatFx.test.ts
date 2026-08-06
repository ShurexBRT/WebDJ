import { describe, expect, it } from 'vitest'
import { echoDelayMsFromBpm, formatEchoDivision } from './beatFx'

describe('beat FX timing', () => {
  it('maps BPM and musical divisions to delay milliseconds', () => {
    expect(echoDelayMsFromBpm(120, '1/4')).toBe(125)
    expect(echoDelayMsFromBpm(120, '1/2')).toBe(250)
    expect(echoDelayMsFromBpm(120, '1')).toBe(500)
    expect(echoDelayMsFromBpm(120, '2')).toBe(1000)
    expect(echoDelayMsFromBpm(120, '4')).toBe(2000)
  })

  it('rejects invalid BPM and clamps extreme delays', () => {
    expect(echoDelayMsFromBpm(0, '1/2')).toBeNull()
    expect(echoDelayMsFromBpm(Number.NaN, '1')).toBeNull()
    expect(echoDelayMsFromBpm(40, '4')).toBe(3900)
  })

  it('formats divisions for the FX display', () => {
    expect(formatEchoDivision('1/2')).toBe('1/2 beat')
  })
})
