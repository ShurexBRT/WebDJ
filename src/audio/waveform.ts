export const DEFAULT_WAVEFORM_BARS = 240

export function normalizePeaks(peaks: number[]): number[] {
  if (peaks.length === 0) return []
  const max = Math.max(...peaks.map((value) => Math.abs(value)))
  if (max === 0) return peaks.map(() => 0)
  return peaks.map((value) => Math.min(1, Math.abs(value) / max))
}

export function extractWaveformPeaks(
  channelData: Float32Array,
  barCount = DEFAULT_WAVEFORM_BARS,
): number[] {
  if (barCount <= 0 || channelData.length === 0) return []

  const bars = Math.min(barCount, channelData.length)
  const blockSize = channelData.length / bars
  const peaks = Array.from({ length: bars }, (_, index) => {
    const start = Math.floor(index * blockSize)
    const end = Math.max(start + 1, Math.floor((index + 1) * blockSize))
    let peak = 0

    for (let sampleIndex = start; sampleIndex < end && sampleIndex < channelData.length; sampleIndex += 1) {
      peak = Math.max(peak, Math.abs(channelData[sampleIndex]))
    }

    return peak
  })

  return normalizePeaks(peaks)
}

export function mergeChannelPeaks(channels: Float32Array[], barCount = DEFAULT_WAVEFORM_BARS): number[] {
  if (channels.length === 0) return []
  const channelPeaks = channels.map((channel) => extractWaveformPeaks(channel, barCount))
  const length = Math.max(...channelPeaks.map((peaks) => peaks.length))

  return Array.from({ length }, (_, index) => {
    const values = channelPeaks.map((peaks) => peaks[index] ?? 0)
    return values.reduce((sum, value) => sum + value, 0) / values.length
  })
}

export async function decodeWaveform(
  file: File,
  context: BaseAudioContext,
  barCount = DEFAULT_WAVEFORM_BARS,
): Promise<number[]> {
  const arrayBuffer = await file.arrayBuffer()
  const audioBuffer = await context.decodeAudioData(arrayBuffer.slice(0))
  const channels = Array.from({ length: audioBuffer.numberOfChannels }, (_, index) => audioBuffer.getChannelData(index))
  return mergeChannelPeaks(channels, barCount)
}
