import { mixProfile, type AutoDjMixProfileId, type AutoDjTransitionStrategy } from './mixProfiles'

export type TrackIntelligence = {
  id: string
  title: string
  artist: string
  genre: string
  bpm: number
  camelotKey: string
  rmsDb: number | null
  durationSeconds: number
  analysisConfidence: number
  lastLoadedAt: number | null
}

export type ScoreBreakdown = {
  tempo: number
  harmonic: number
  energy: number
  genre: number
  duration: number
  confidence: number
  recencyPenalty: number
}

export type TrackSuggestion = {
  trackId: string
  score: number
  confidence: number
  transition: AutoDjTransitionStrategy
  reasons: string[]
  warnings: string[]
  breakdown: ScoreBreakdown
}

const clamp100 = (value: number) => Math.max(0, Math.min(100, value))

function tempoScore(referenceBpm: number, candidateBpm: number): number {
  if (referenceBpm <= 0 || candidateBpm <= 0) return 35
  const difference = Math.abs(referenceBpm - candidateBpm)
  if (difference <= 1) return 100
  if (difference <= 3) return 92
  if (difference <= 6) return 78
  if (difference <= 10) return 58
  if (difference <= 16) return 32
  return 8
}

function parseCamelot(value: string): { number: number; mode: 'A' | 'B' } | null {
  const match = /^(1[0-2]|[1-9])([AB])$/i.exec(value.trim())
  if (!match) return null
  return { number: Number(match[1]), mode: match[2].toUpperCase() as 'A' | 'B' }
}

function wheelDistance(left: number, right: number): number {
  const direct = Math.abs(left - right)
  return Math.min(direct, 12 - direct)
}

function harmonicScore(referenceKey: string, candidateKey: string): number {
  const reference = parseCamelot(referenceKey)
  const candidate = parseCamelot(candidateKey)
  if (!reference || !candidate) return 45
  if (reference.number === candidate.number && reference.mode === candidate.mode) return 100
  if (reference.number === candidate.number && reference.mode !== candidate.mode) return 94
  const distance = wheelDistance(reference.number, candidate.number)
  if (distance === 1 && reference.mode === candidate.mode) return 90
  if (distance === 2 && reference.mode === candidate.mode) return 68
  if (distance === 1 && reference.mode !== candidate.mode) return 62
  return 20
}

function energyScore(referenceRms: number | null, candidateRms: number | null): number {
  if (referenceRms === null || candidateRms === null) return 50
  const difference = Math.abs(referenceRms - candidateRms)
  if (difference <= 1.5) return 100
  if (difference <= 3) return 82
  if (difference <= 5) return 62
  if (difference <= 8) return 38
  return 15
}

function genreScore(referenceGenre: string, candidateGenre: string): number {
  const left = referenceGenre.trim().toLowerCase()
  const right = candidateGenre.trim().toLowerCase()
  if (!left || !right) return 50
  if (left === right) return 100
  const leftTokens = new Set(left.split(/[^a-z0-9]+/).filter(Boolean))
  const rightTokens = right.split(/[^a-z0-9]+/).filter(Boolean)
  return rightTokens.some((token) => leftTokens.has(token)) ? 78 : 35
}

function durationScore(durationSeconds: number): number {
  if (durationSeconds <= 0) return 45
  if (durationSeconds >= 150 && durationSeconds <= 480) return 100
  if (durationSeconds >= 90 && durationSeconds <= 600) return 75
  return 40
}

function recencyPenalty(lastLoadedAt: number | null, now: number): number {
  if (!lastLoadedAt) return 0
  const minutes = Math.max(0, (now - lastLoadedAt) / 60_000)
  if (minutes < 10) return 35
  if (minutes < 30) return 22
  if (minutes < 120) return 10
  return 0
}

function chooseTransition(
  breakdown: ScoreBreakdown,
  profileId: AutoDjMixProfileId,
  analysisConfidence: number,
): AutoDjTransitionStrategy {
  // A doubtful BPM estimate should not trigger the most abrupt transition.
  // Echo-out is a safer mask while the analysis confidence is low.
  if (analysisConfidence < 0.55 && breakdown.tempo < 45) return 'echo-out'

  if (profileId === 'club') {
    if (breakdown.tempo >= 75 && breakdown.energy >= 65) return 'bass-swap'
    if (breakdown.tempo >= 60 && breakdown.harmonic >= 45) return 'filter-blend'
    if (breakdown.tempo >= 35) return 'echo-out'
    return 'hard-cut'
  }
  if (profileId === 'deep') {
    if (breakdown.tempo >= 70 && breakdown.harmonic >= 80) return 'long-blend'
    if (breakdown.tempo >= 55 && breakdown.harmonic >= 60) return 'filter-blend'
    if (breakdown.tempo >= 75 && breakdown.energy >= 70) return 'bass-swap'
    if (breakdown.tempo >= 35) return 'echo-out'
    return 'hard-cut'
  }
  if (profileId === 'quick') {
    if (breakdown.tempo >= 70 && breakdown.energy >= 65) return 'bass-swap'
    if (breakdown.tempo >= 45) return 'echo-out'
    return 'hard-cut'
  }
  if (breakdown.tempo >= 80 && breakdown.harmonic >= 75 && breakdown.energy >= 55) return 'long-blend'
  if (breakdown.tempo >= 80 && breakdown.energy >= 70) return 'bass-swap'
  if (breakdown.tempo >= 55 && breakdown.harmonic >= 50) return 'filter-blend'
  if (breakdown.tempo >= 35) return 'echo-out'
  return 'hard-cut'
}

function energyDirectionAdjustment(
  referenceRms: number | null,
  candidateRms: number | null,
  profileId: AutoDjMixProfileId,
): number {
  if (referenceRms === null || candidateRms === null) return 0
  const delta = candidateRms - referenceRms
  if (profileId === 'club') {
    if (delta >= 0.5 && delta <= 3) return 5
    if (delta < -4) return -5
  }
  if (profileId === 'quick') {
    if (delta >= 0.5 && delta <= 4) return 3
    if (delta < -5) return -3
  }
  return 0
}

export function scoreTrackCandidate(
  reference: TrackIntelligence,
  candidate: TrackIntelligence,
  now = Date.now(),
  profileId: AutoDjMixProfileId = 'smooth',
): TrackSuggestion {
  const profile = mixProfile(profileId)
  const breakdown: ScoreBreakdown = {
    tempo: tempoScore(reference.bpm, candidate.bpm),
    harmonic: harmonicScore(reference.camelotKey, candidate.camelotKey),
    energy: energyScore(reference.rmsDb, candidate.rmsDb),
    genre: genreScore(reference.genre, candidate.genre),
    duration: durationScore(candidate.durationSeconds),
    confidence: clamp100(candidate.analysisConfidence * 100),
    recencyPenalty: recencyPenalty(candidate.lastLoadedAt, now),
  }

  const weighted = (
    breakdown.tempo * profile.scoring.tempo
    + breakdown.harmonic * profile.scoring.harmonic
    + breakdown.energy * profile.scoring.energy
    + breakdown.genre * profile.scoring.genre
    + breakdown.duration * profile.scoring.duration
    + breakdown.confidence * profile.scoring.confidence
    + energyDirectionAdjustment(reference.rmsDb, candidate.rmsDb, profileId)
    - breakdown.recencyPenalty
  )

  const reasons: string[] = []
  const warnings: string[] = []
  const bpmDifference = reference.bpm > 0 && candidate.bpm > 0 ? Math.abs(reference.bpm - candidate.bpm) : null
  const energyDelta = reference.rmsDb !== null && candidate.rmsDb !== null ? candidate.rmsDb - reference.rmsDb : null

  if (breakdown.recencyPenalty > 0) warnings.push('Recently played')
  if (candidate.analysisConfidence < 0.55) warnings.push('Low analysis confidence')

  if (breakdown.tempo >= 85 && bpmDifference !== null) reasons.push(`${bpmDifference.toFixed(1)} BPM difference`)
  else if (reference.bpm <= 0 || candidate.bpm <= 0) warnings.push('BPM analysis missing')
  else warnings.push(`${bpmDifference!.toFixed(1)} BPM apart`)

  if (breakdown.harmonic >= 85) reasons.push('Camelot-compatible key')
  else if (!reference.camelotKey || !candidate.camelotKey) warnings.push('Key analysis missing')
  else if (breakdown.harmonic < 45) warnings.push('Possible harmonic clash')

  if (energyDelta !== null && (profileId === 'club' || profileId === 'quick') && energyDelta >= 0.5 && energyDelta <= 4) reasons.push('Controlled energy lift')
  else if (breakdown.energy >= 80 && reference.rmsDb !== null && candidate.rmsDb !== null) reasons.push('Similar loudness energy')
  else if (reference.rmsDb === null || candidate.rmsDb === null) warnings.push('Energy estimate unavailable')

  if (breakdown.genre >= 78) reasons.push('Related genre metadata')

  return {
    trackId: candidate.id,
    score: Math.round(clamp100(weighted)),
    confidence: Math.round(clamp100(candidate.analysisConfidence * 100)),
    transition: chooseTransition(breakdown, profileId, candidate.analysisConfidence),
    reasons: reasons.slice(0, 3),
    warnings: warnings.slice(0, 3),
    breakdown,
  }
}

export function rankTrackCandidates(
  reference: TrackIntelligence,
  candidates: TrackIntelligence[],
  now = Date.now(),
  profileId: AutoDjMixProfileId = 'smooth',
): TrackSuggestion[] {
  return candidates
    .filter((candidate) => candidate.id !== reference.id)
    .map((candidate) => scoreTrackCandidate(reference, candidate, now, profileId))
    .sort((left, right) => right.score - left.score || right.confidence - left.confidence)
}
