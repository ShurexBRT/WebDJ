import { describe, expect, it } from 'vitest'
import { midiMessageSignature } from './useMidiController'

describe('MIDI message signatures', () => {
  it('identifies note and control-change messages including channel', () => {
    expect(midiMessageSignature(new Uint8Array([0x90, 36, 127]))).toBe('144-36')
    expect(midiMessageSignature(new Uint8Array([0x91, 36, 127]))).toBe('145-36')
    expect(midiMessageSignature(new Uint8Array([0xb0, 7, 64]))).toBe('176-7')
    expect(midiMessageSignature(new Uint8Array([0x80, 36, 0]))).toBe('128-36')
  })

  it('ignores unsupported and incomplete MIDI messages', () => {
    expect(midiMessageSignature(new Uint8Array([0xe0, 0, 64]))).toBeNull()
    expect(midiMessageSignature(new Uint8Array([0x90]))).toBeNull()
  })
})
