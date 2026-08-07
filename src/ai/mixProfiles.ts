export type AutoDjMixProfileId = 'smooth' | 'club' | 'deep' | 'quick'

export type AutoDjTransitionStrategy = 'long-blend' | 'bass-swap' | 'filter-blend' | 'echo-out' | 'hard-cut'

type ScoringWeights = {
  tempo: number
  harmonic: number
  energy: number
  genre: number
  duration: number
  confidence: number
}

export type AutoDjMixProfile = {
  id: AutoDjMixProfileId
  label: string
  shortDescription: string
  scoring: ScoringWeights
  transitionBeats: Record<AutoDjTransitionStrategy, number>
}

export const AUTO_DJ_MIX_PROFILES: Record<AutoDjMixProfileId, AutoDjMixProfile> = {
  smooth: {
    id: 'smooth',
    label: 'Smooth',
    shortDescription: 'Long phrase blends, harmonic flow and clean bass handoffs',
    scoring: { tempo: 0.30, harmonic: 0.28, energy: 0.18, genre: 0.10, duration: 0.04, confidence: 0.10 },
    transitionBeats: { 'long-blend': 128, 'bass-swap': 64, 'filter-blend': 64, 'echo-out': 16, 'hard-cut': 4 },
  },
  club: {
    id: 'club',
    label: 'Club Energy',
    shortDescription: 'Punchier EQ swaps and energy-preserving transitions',
    scoring: { tempo: 0.24, harmonic: 0.12, energy: 0.30, genre: 0.14, duration: 0.05, confidence: 0.15 },
    transitionBeats: { 'long-blend': 64, 'bass-swap': 32, 'filter-blend': 32, 'echo-out': 16, 'hard-cut': 4 },
  },
  deep: {
    id: 'deep',
    label: 'Deep / Melodic',
    shortDescription: 'Harmonic-first blends with restrained filter movement',
    scoring: { tempo: 0.20, harmonic: 0.34, energy: 0.18, genre: 0.12, duration: 0.05, confidence: 0.11 },
    transitionBeats: { 'long-blend': 64, 'bass-swap': 64, 'filter-blend': 64, 'echo-out': 16, 'hard-cut': 4 },
  },
  quick: {
    id: 'quick',
    label: 'Quick Cut',
    shortDescription: 'Fast open-format changes with looser harmonic constraints',
    scoring: { tempo: 0.18, harmonic: 0.08, energy: 0.28, genre: 0.22, duration: 0.08, confidence: 0.16 },
    transitionBeats: { 'long-blend': 16, 'bass-swap': 8, 'filter-blend': 8, 'echo-out': 8, 'hard-cut': 2 },
  },
}

export const AUTO_DJ_PROFILE_IDS = Object.keys(AUTO_DJ_MIX_PROFILES) as AutoDjMixProfileId[]

export function isAutoDjMixProfileId(value: string): value is AutoDjMixProfileId {
  return value in AUTO_DJ_MIX_PROFILES
}

export function mixProfile(profileId: AutoDjMixProfileId): AutoDjMixProfile {
  return AUTO_DJ_MIX_PROFILES[profileId]
}
