import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom does not implement the Web Audio worklet surface. Playback uses the real
// browser AudioWorkletNode in production, but statically bundling SoundTouch means
// its class is evaluated while unrelated unit suites import the audio engine.
if (typeof globalThis.AudioWorkletNode === 'undefined') {
  Object.defineProperty(globalThis, 'AudioWorkletNode', {
    configurable: true,
    writable: true,
    value: class MockAudioWorkletNode {},
  })
}

afterEach(() => {
  cleanup()
})
