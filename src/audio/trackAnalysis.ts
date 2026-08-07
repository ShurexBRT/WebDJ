import { analyzeAudioBufferBpm, type BpmAnalysisResult } from './bpmAnalysis'
import { analyzeAudioBufferKey, type KeyAnalysisResult } from './keyDetection'
import { analyzeAudioBufferGain, type GainAnalysisResult } from './mastering'
import { mergeChannelPeaks } from './waveform'

export type TrackAnalysisResult = {
  durationSeconds: number
  waveform: number[]
  bpm: BpmAnalysisResult | null
  key: KeyAnalysisResult | null
  gain: GainAnalysisResult | null
}

export async function decodeTrackFile(
  file: File,
  context: BaseAudioContext,
): Promise<AudioBuffer> {
  const encoded = await file.arrayBuffer()
  return context.decodeAudioData(encoded.slice(0))
}

export function analyzeDecodedTrack(buffer: AudioBuffer): TrackAnalysisResult {
  const channels = Array.from(
    { length: buffer.numberOfChannels },
    (_, channelIndex) => buffer.getChannelData(channelIndex),
  )

  return {
    durationSeconds: buffer.duration,
    waveform: mergeChannelPeaks(channels),
    bpm: analyzeAudioBufferBpm(buffer),
    key: analyzeAudioBufferKey(buffer),
    gain: analyzeAudioBufferGain(buffer),
  }
}

export async function analyzeTrackFile(
  file: File,
  context: BaseAudioContext,
): Promise<TrackAnalysisResult> {
  return analyzeDecodedTrack(await decodeTrackFile(file, context))
}
