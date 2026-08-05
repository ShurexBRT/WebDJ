import { getAudioEngine, type AudioEngine } from './AudioEngine'

export type SamplerMode = 'one-shot' | 'loop'

export type SamplerTriggerOptions = {
  mode: SamplerMode
  volume: number
  delaySeconds?: number
}

type EngineSamplerInternals = {
  masterGain: GainNode
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))

export function secondsUntilNextBeat(timeSeconds: number, bpm: number, beatOffsetSeconds = 0): number {
  if (!Number.isFinite(timeSeconds) || !Number.isFinite(bpm) || bpm <= 0) return 0
  const beatDuration = 60 / bpm
  const phase = ((timeSeconds - beatOffsetSeconds) % beatDuration + beatDuration) % beatDuration
  if (phase <= 0.002 || beatDuration - phase <= 0.002) return 0
  return beatDuration - phase
}

export class SamplerPlayer {
  private readonly context: AudioContext
  private readonly outputGain: GainNode
  private readonly buffers = new Map<number, AudioBuffer>()
  private readonly activeSources = new Map<number, AudioBufferSourceNode>()

  constructor(engine: AudioEngine) {
    this.context = engine.context
    this.outputGain = this.context.createGain()
    this.outputGain.gain.value = 0.8
    const masterGain = (engine as unknown as EngineSamplerInternals).masterGain
    this.outputGain.connect(masterGain)
  }

  async loadSlot(slot: number, blob: Blob): Promise<void> {
    const bytes = await blob.arrayBuffer()
    const buffer = await this.context.decodeAudioData(bytes.slice(0))
    this.buffers.set(slot, buffer)
  }

  hasSlot(slot: number): boolean {
    return this.buffers.has(slot)
  }

  setMasterVolume(value: number): void {
    this.outputGain.gain.setTargetAtTime(clamp(value), this.context.currentTime, 0.01)
  }

  trigger(slot: number, options: SamplerTriggerOptions): boolean {
    const buffer = this.buffers.get(slot)
    if (!buffer) return false

    if (options.mode === 'loop' && this.activeSources.has(slot)) {
      this.stop(slot)
      return false
    }

    const source = this.context.createBufferSource()
    const gain = this.context.createGain()
    source.buffer = buffer
    source.loop = options.mode === 'loop'
    gain.gain.value = clamp(options.volume)
    source.connect(gain).connect(this.outputGain)
    source.onended = () => {
      if (this.activeSources.get(slot) === source) this.activeSources.delete(slot)
      source.disconnect()
      gain.disconnect()
    }
    this.activeSources.set(slot, source)
    source.start(this.context.currentTime + Math.max(0, options.delaySeconds ?? 0))
    return true
  }

  stop(slot: number): void {
    const source = this.activeSources.get(slot)
    if (!source) return
    try {
      source.stop()
    } catch {
      // The source may already have ended between UI frames.
    }
    this.activeSources.delete(slot)
  }

  clearSlot(slot: number): void {
    this.stop(slot)
    this.buffers.delete(slot)
  }

  stopAll(): void {
    Array.from(this.activeSources.keys()).forEach((slot) => this.stop(slot))
  }
}

let samplerPlayer: SamplerPlayer | null = null

export function getSamplerPlayer(): SamplerPlayer {
  if (!samplerPlayer) samplerPlayer = new SamplerPlayer(getAudioEngine())
  return samplerPlayer
}
