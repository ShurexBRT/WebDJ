import { analyzeAudioBufferBpm, type BpmAnalysisResult } from './bpmAnalysis'
import { analyzeAudioBufferKey, type KeyAnalysisResult } from './keyDetection'
import { analyzeAudioBufferGain, type GainAnalysisResult } from './mastering'
import { mergeChannelPeaks } from './waveform'

export type TrackAnalysisResult = {
  waveform: number[]
  bpm: BpmAnalysisResult | null
  key: KeyAnalysisResult | null
  gain: GainAnalysisResult | null
}

export async function analyzeTrackFile(
  file: File,
  context: BaseAudioContext,
): Promise<TrackAnalysisResult> {
  const encoded = await file.arrayBuffer()
  const buffer = await context.decodeAudioData(encoded.slice(0))
  const channels = Array.from(
    { length: buffer.numberOfChannels },
    (_, channelIndex) => buffer.getChannelData(channelIndex),
  )

  return {
    waveform: mergeChannelPeaks(channels),
    bpm: analyzeAudioBufferBpm(buffer),
    key: analyzeAudioBufferKey(buffer),
    gain: analyzeAudioBufferGain(buffer),
  }
}
