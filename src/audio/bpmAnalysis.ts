import { normalizeBpm } from './tempo'

export type BpmAnalysisResult = {
  bpm: number
  confidence: number
}

const MIN_BPM = 70
const MAX_BPM = 180
const ENVELOPE_RATE = 200
const analysisCache = new Map<string, BpmAnalysisResult>()

export function createAudioFileCacheKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`
}

export function clearBpmAnalysisCache(): void {
  analysisCache.clear()
}

export function mixAudioBufferToMono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 0 || buffer.length === 0) return new Float32Array()

  const mono = new Float32Array(buffer.length)
  for (let channelIndex = 0; channelIndex < buffer.numberOfChannels; channelIndex += 1) {
    const channel = buffer.getChannelData(channelIndex)
    for (let sampleIndex = 0; sampleIndex < buffer.length; sampleIndex += 1) {
      mono[sampleIndex] += channel[sampleIndex] / buffer.numberOfChannels
    }
  }
  return mono
}

export function createOnsetEnvelope(
  samples: Float32Array,
  sampleRate: number,
  envelopeRate = ENVELOPE_RATE,
): Float32Array {
  if (samples.length === 0 || sampleRate <= 0 || envelopeRate <= 0) return new Float32Array()

  const blockSize = Math.max(1, Math.floor(sampleRate / envelopeRate))
  const blockCount = Math.floor(samples.length / blockSize)
  const energy = new Float32Array(blockCount)

  for (let blockIndex = 0; blockIndex < blockCount; blockIndex += 1) {
    const start = blockIndex * blockSize
    let sumSquares = 0
    for (let offset = 0; offset < blockSize; offset += 1) {
      const sample = samples[start + offset]
      sumSquares += sample * sample
    }
    energy[blockIndex] = Math.sqrt(sumSquares / blockSize)
  }

  const onset = new Float32Array(blockCount)
  let max = 0
  for (let index = 1; index < blockCount; index += 1) {
    const difference = Math.max(0, energy[index] - energy[index - 1])
    onset[index] = difference
    max = Math.max(max, difference)
  }

  if (max > 0) {
    for (let index = 0; index < onset.length; index += 1) onset[index] /= max
  }

  return onset
}

export function estimateBpmFromEnvelope(
  envelope: Float32Array,
  envelopeRate = ENVELOPE_RATE,
  minBpm = MIN_BPM,
  maxBpm = MAX_BPM,
): BpmAnalysisResult | null {
  if (envelope.length < envelopeRate * 4 || envelopeRate <= 0) return null

  const minimumLag = Math.floor((60 * envelopeRate) / maxBpm)
  const maximumLag = Math.ceil((60 * envelopeRate) / minBpm)
  let bestLag = 0
  let bestScore = 0
  let scoreTotal = 0

  for (let lag = minimumLag; lag <= maximumLag; lag += 1) {
    let correlation = 0
    let energyA = 0
    let energyB = 0

    for (let index = lag; index < envelope.length; index += 1) {
      const a = envelope[index]
      const b = envelope[index - lag]
      correlation += a * b
      energyA += a * a
      energyB += b * b
    }

    const normalized = energyA > 0 && energyB > 0
      ? correlation / Math.sqrt(energyA * energyB)
      : 0
    scoreTotal += normalized

    if (normalized > bestScore) {
      bestScore = normalized
      bestLag = lag
    }
  }

  if (bestLag === 0 || bestScore < 0.08) return null

  const bpm = normalizeBpm((60 * envelopeRate) / bestLag)
  const averageScore = scoreTotal / Math.max(1, maximumLag - minimumLag + 1)
  const confidence = Math.min(1, Math.max(0, bestScore - averageScore))

  return { bpm, confidence: Math.round(confidence * 100) / 100 }
}

export function analyzeAudioBufferBpm(buffer: AudioBuffer): BpmAnalysisResult | null {
  const mono = mixAudioBufferToMono(buffer)
  const envelope = createOnsetEnvelope(mono, buffer.sampleRate)
  return estimateBpmFromEnvelope(envelope)
}

export async function analyzeFileBpm(
  file: File,
  context: BaseAudioContext,
): Promise<BpmAnalysisResult | null> {
  const cacheKey = createAudioFileCacheKey(file)
  const cached = analysisCache.get(cacheKey)
  if (cached) return cached

  const arrayBuffer = await file.arrayBuffer()
  const audioBuffer = await context.decodeAudioData(arrayBuffer.slice(0))
  const result = analyzeAudioBufferBpm(audioBuffer)
  if (result) analysisCache.set(cacheKey, result)
  return result
}
