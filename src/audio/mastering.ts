export type GainAnalysisResult = {
  rmsDb: number
  peakDb: number
  recommendedTrimDb: number
  confidence: number
}

const toDb = (amplitude: number) => amplitude > 0 ? 20 * Math.log10(amplitude) : -Infinity
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const roundTenth = (value: number) => Math.round(value * 10) / 10

export function recommendTrimDb(
  rmsDb: number,
  peakDb: number,
  targetRmsDb = -16,
): number {
  if (!Number.isFinite(rmsDb) || !Number.isFinite(peakDb)) return 0
  const loudnessCorrection = targetRmsDb - rmsDb
  const peakHeadroom = -1 - peakDb
  return roundTenth(clamp(Math.min(loudnessCorrection, peakHeadroom), -12, 6))
}

export function analyzeAudioBufferGain(buffer: AudioBuffer, maxSamples = 300_000): GainAnalysisResult | null {
  if (buffer.numberOfChannels <= 0 || buffer.length <= 0) return null
  const stride = Math.max(1, Math.floor(buffer.length / maxSamples))
  let squareSum = 0
  let sampleCount = 0
  let peak = 0
  let activeSamples = 0

  for (let index = 0; index < buffer.length; index += stride) {
    let sample = 0
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      sample += buffer.getChannelData(channel)[index] ?? 0
    }
    sample /= buffer.numberOfChannels
    const absolute = Math.abs(sample)
    peak = Math.max(peak, absolute)
    if (absolute < 0.0005) continue
    squareSum += sample * sample
    sampleCount += 1
    if (absolute > 0.01) activeSamples += 1
  }

  if (sampleCount < 100 || peak <= 0) return null
  const rms = Math.sqrt(squareSum / sampleCount)
  const rmsDb = roundTenth(toDb(rms))
  const peakDb = roundTenth(toDb(peak))
  const activityRatio = activeSamples / sampleCount
  const confidence = Math.round(clamp(activityRatio * 1.6, 0, 1) * 100) / 100

  return {
    rmsDb,
    peakDb,
    recommendedTrimDb: recommendTrimDb(rmsDb, peakDb),
    confidence,
  }
}

export function isClipRisk(preLimiterLevel: number, limiterReductionDb: number): boolean {
  return preLimiterLevel >= 0.98 || limiterReductionDb >= 1.5
}
