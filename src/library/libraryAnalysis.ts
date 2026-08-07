import type { TrackAnalysisResult } from '../audio/trackAnalysis'
import type { LibraryTrack } from '../state/libraryStore'
import type { TrackProfile } from '../storage/trackProfiles'

const hasFiniteNumber = (value: number | undefined): value is number => typeof value === 'number' && Number.isFinite(value)

export function isTrackProfileAnalysisComplete(profile: TrackProfile | null): boolean {
  if (!profile) return false
  return profile.bpmAnalysisStatus !== 'idle'
    && (profile.keyAnalysisStatus ?? 'idle') !== 'idle'
    && (profile.gainAnalysisStatus ?? (hasFiniteNumber(profile.gainRmsDb) ? 'detected' : 'idle')) !== 'idle'
    && profile.waveform.length > 0
}

export function isTrackProfileAutoDjUsable(profile: TrackProfile | null): boolean {
  if (!profile) return false
  const gainStatus = profile.gainAnalysisStatus ?? (hasFiniteNumber(profile.gainRmsDb) ? 'detected' : 'idle')
  return profile.bpm > 0
    && (profile.bpmAnalysisStatus === 'detected' || profile.bpmAnalysisStatus === 'manual')
    && (profile.keyAnalysisStatus ?? 'idle') !== 'idle'
    && gainStatus === 'detected'
    && hasFiniteNumber(profile.gainRmsDb)
}

export function mergeLibraryAnalysisProfile(
  track: LibraryTrack,
  analysis: TrackAnalysisResult,
  existing: TrackProfile | null,
): TrackProfile {
  const existingBpmReady = !!existing && existing.bpmAnalysisStatus !== 'idle'
  const existingKeyReady = !!existing && (existing.keyAnalysisStatus ?? 'idle') !== 'idle'
  const existingGainReady = !!existing && (existing.gainAnalysisStatus
    ?? (hasFiniteNumber(existing.gainRmsDb) ? 'detected' : 'idle')) !== 'idle'
  const existingWaveformReady = !!existing?.waveform.length

  return {
    id: track.id,
    fileName: track.fileName,
    fileSize: track.size,
    lastModified: track.file?.lastModified ?? existing?.lastModified ?? 0,
    durationSeconds: analysis.durationSeconds || existing?.durationSeconds || track.durationSeconds || 0,
    bpm: existingBpmReady ? existing!.bpm : analysis.bpm?.bpm ?? 0,
    bpmConfidence: existingBpmReady ? existing!.bpmConfidence : analysis.bpm?.confidence ?? 0,
    bpmAnalysisStatus: existingBpmReady ? existing!.bpmAnalysisStatus : analysis.bpm ? 'detected' : 'failed',
    key: existingKeyReady ? existing!.key ?? '' : analysis.key?.key ?? '',
    camelotKey: existingKeyReady ? existing!.camelotKey ?? '' : analysis.key?.camelot ?? '',
    keyConfidence: existingKeyReady ? existing!.keyConfidence ?? 0 : analysis.key?.confidence ?? 0,
    keyAnalysisStatus: existingKeyReady ? existing!.keyAnalysisStatus ?? 'idle' : analysis.key ? 'detected' : 'failed',
    gainRecommendationDb: existingGainReady ? existing!.gainRecommendationDb : analysis.gain?.recommendedTrimDb,
    gainRmsDb: existingGainReady ? existing!.gainRmsDb : analysis.gain?.rmsDb,
    gainPeakDb: existingGainReady ? existing!.gainPeakDb : analysis.gain?.peakDb,
    gainConfidence: existingGainReady ? existing!.gainConfidence : analysis.gain?.confidence,
    gainAnalysisStatus: existingGainReady
      ? existing!.gainAnalysisStatus ?? 'detected'
      : analysis.gain ? 'detected' : 'failed',
    beatOffsetSeconds: existing?.beatOffsetSeconds ?? 0,
    barOffsetBeats: existing?.barOffsetBeats ?? 0,
    waveform: existingWaveformReady ? existing!.waveform : analysis.waveform,
    cuePoint: existing?.cuePoint ?? null,
    hotCues: existing?.hotCues ?? [null, null, null, null, null, null],
    loopBeats: existing?.loopBeats ?? 4,
    updatedAt: Date.now(),
  }
}
