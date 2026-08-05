import { describe, expect, it } from 'vitest'
import { createOnsetEnvelope, estimateBpmFromEnvelope } from './bpmAnalysis'

function createPulseEnvelope(bpm: number, seconds = 20, envelopeRate = 200): Float32Array {
  const length = seconds * envelopeRate
  const envelope = new Float32Array(length)
  const interval = Math.round((60 * envelopeRate) / bpm)

  for (let index = 0; index < length; index += interval) {
    envelope[index] = 1
    if (index + 1 < length) envelope[index + 1] = 0.45
  }

  return envelope
}

describe('BPM analysis', () => {
  it('detects a regular 120 BPM pulse train', () => {
    const result = estimateBpmFromEnvelope(createPulseEnvelope(120))
    expect(result?.bpm).toBeCloseTo(120, 1)
    expect(result?.confidence).toBeGreaterThan(0.5)
  })

  it('detects a regular 128 BPM pulse train', () => {
    const result = estimateBpmFromEnvelope(createPulseEnvelope(128))
    expect(result?.bpm).toBeCloseTo(128, 0)
  })

  it('rejects empty and too-short envelopes', () => {
    expect(estimateBpmFromEnvelope(new Float32Array())).toBeNull()
    expect(estimateBpmFromEnvelope(new Float32Array(100))).toBeNull()
  })

  it('creates a normalized onset envelope from sample energy changes', () => {
    const samples = new Float32Array(1_000)
    samples.fill(0, 0, 500)
    samples.fill(1, 500)

    const envelope = createOnsetEnvelope(samples, 1_000, 100)
    expect(envelope.length).toBe(100)
    expect(Math.max(...envelope)).toBe(1)
  })
})
