import Meyda from 'meyda'
import { mixAudioBufferToMono } from './bpmAnalysis'

export type KeyMode = 'major' | 'minor'
export type KeyAnalysisResult = {
  root: number
  mode: KeyMode
  key: string
  shortKey: string
  camelot: string
  confidence: number
  score: number
}

export type HarmonicCompatibility = 'same' | 'relative' | 'compatible' | 'energy' | 'clash' | 'unknown'

const NOTE_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'] as const
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]

const MAJOR_CAMELOT = ['8B', '3B', '10B', '5B', '12B', '7B', '2B', '9B', '4B', '11B', '6B', '1B']
const MINOR_CAMELOT = ['5A', '12A', '7A', '2A', '9A', '4A', '11A', '6A', '1A', '8A', '3A', '10A']

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))
const roundConfidence = (value: number) => Math.round(clamp01(value) * 100) / 100

function cosineSimilarity(left: number[], right: number[]): number {
  let dot = 0
  let leftEnergy = 0
  let rightEnergy = 0
  for (let index = 0; index < 12; index += 1) {
    const leftValue = left[index] ?? 0
    const rightValue = right[index] ?? 0
    dot += leftValue * rightValue
    leftEnergy += leftValue * leftValue
    rightEnergy += rightValue * rightValue
  }
  if (leftEnergy <= 0 || rightEnergy <= 0) return 0
  return dot / Math.sqrt(leftEnergy * rightEnergy)
}

function profileForRoot(profile: number[], root: number): number[] {
  return Array.from({ length: 12 }, (_, pitchClass) => profile[(pitchClass - root + 12) % 12])
}

export function camelotForKey(root: number, mode: KeyMode): string {
  const normalizedRoot = ((Math.round(root) % 12) + 12) % 12
  return mode === 'major' ? MAJOR_CAMELOT[normalizedRoot] : MINOR_CAMELOT[normalizedRoot]
}

export function formatDetectedKey(root: number, mode: KeyMode): Pick<KeyAnalysisResult, 'key' | 'shortKey' | 'camelot'> {
  const normalizedRoot = ((Math.round(root) % 12) + 12) % 12
  const note = NOTE_NAMES[normalizedRoot]
  return {
    key: `${note} ${mode}`,
    shortKey: mode === 'major' ? note : `${note}m`,
    camelot: camelotForKey(normalizedRoot, mode),
  }
}

export function detectKeyFromChroma(chroma: number[]): KeyAnalysisResult | null {
  if (chroma.length < 12) return null
  const normalized = chroma.slice(0, 12).map((value) => Math.max(0, Number.isFinite(value) ? value : 0))
  const total = normalized.reduce((sum, value) => sum + value, 0)
  if (total <= 0) return null

  const candidates = Array.from({ length: 12 }, (_, root) => [
    { root, mode: 'major' as const, score: cosineSimilarity(normalized, profileForRoot(MAJOR_PROFILE, root)) },
    { root, mode: 'minor' as const, score: cosineSimilarity(normalized, profileForRoot(MINOR_PROFILE, root)) },
  ]).flat().sort((left, right) => right.score - left.score)

  const best = candidates[0]
  const runnerUp = candidates[1]
  if (!best || best.score < 0.5) return null

  const margin = Math.max(0, best.score - (runnerUp?.score ?? 0))
  const confidence = roundConfidence(margin * 3.2 + Math.max(0, best.score - 0.7) * 0.65)
  const formatted = formatDetectedKey(best.root, best.mode)
  return { ...best, ...formatted, confidence, score: Math.round(best.score * 1000) / 1000 }
}

export function aggregateAudioBufferChroma(buffer: AudioBuffer, maxFrames = 180): number[] | null {
  const mono = mixAudioBufferToMono(buffer)
  if (mono.length < 4096 || buffer.sampleRate <= 0) return null

  const frameSize = 4096
  const start = buffer.duration > 30 ? Math.floor(buffer.sampleRate * 8) : 0
  const endPadding = buffer.duration > 30 ? Math.floor(buffer.sampleRate * 5) : 0
  const end = Math.max(start + frameSize, mono.length - endPadding)
  const available = Math.max(frameSize, end - start)
  const stride = Math.max(frameSize, Math.floor(available / Math.max(1, maxFrames)))
  const aggregate = Array.from({ length: 12 }, () => 0)
  let weightTotal = 0

  Meyda.bufferSize = frameSize
  Meyda.sampleRate = buffer.sampleRate
  Meyda.chromaBands = 12

  for (let offset = start; offset + frameSize <= end; offset += stride) {
    const frame = mono.slice(offset, offset + frameSize)
    const features = Meyda.extract(['chroma', 'rms'], frame)
    const chroma = features?.chroma
    const rms = features?.rms ?? 0
    if (!chroma || chroma.length < 12 || rms < 0.006) continue

    const weight = Math.min(1, Math.max(0.05, rms * 8))
    for (let pitchClass = 0; pitchClass < 12; pitchClass += 1) {
      aggregate[pitchClass] += Math.max(0, chroma[pitchClass] ?? 0) * weight
    }
    weightTotal += weight
  }

  if (weightTotal <= 0) return null
  return aggregate.map((value) => value / weightTotal)
}

export function analyzeAudioBufferKey(buffer: AudioBuffer): KeyAnalysisResult | null {
  const chroma = aggregateAudioBufferChroma(buffer)
  return chroma ? detectKeyFromChroma(chroma) : null
}

export function harmonicCompatibility(leftCamelot: string, rightCamelot: string): HarmonicCompatibility {
  const left = /^(\d{1,2})([AB])$/.exec(leftCamelot)
  const right = /^(\d{1,2})([AB])$/.exec(rightCamelot)
  if (!left || !right) return 'unknown'

  const leftNumber = Number(left[1])
  const rightNumber = Number(right[1])
  const leftLetter = left[2]
  const rightLetter = right[2]
  if (leftNumber === rightNumber && leftLetter === rightLetter) return 'same'
  if (leftNumber === rightNumber && leftLetter !== rightLetter) return 'relative'

  const clockwise = (rightNumber - leftNumber + 12) % 12
  const counterClockwise = (leftNumber - rightNumber + 12) % 12
  const distance = Math.min(clockwise, counterClockwise)
  if (leftLetter === rightLetter && distance === 1) return 'compatible'
  if (leftLetter === rightLetter && distance === 2) return 'energy'
  return 'clash'
}

export function compatibilityLabel(compatibility: HarmonicCompatibility): string {
  switch (compatibility) {
    case 'same': return 'SAME KEY'
    case 'relative': return 'RELATIVE'
    case 'compatible': return 'HARMONIC'
    case 'energy': return 'ENERGY SHIFT'
    case 'clash': return 'KEY CLASH'
    default: return 'KEY —'
  }
}

export const KEY_OPTIONS = Array.from({ length: 12 }, (_, root) => ([
  { ...formatDetectedKey(root, 'major'), root, mode: 'major' as const },
  { ...formatDetectedKey(root, 'minor'), root, mode: 'minor' as const },
])).flat()
