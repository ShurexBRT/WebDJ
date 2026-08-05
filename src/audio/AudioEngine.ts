import { calculateCrossfaderGains } from './crossfader'
import type { DeckId } from '../state/mixerStore'

type DeckCallbacks = {
  onTimeUpdate?: (currentTime: number, duration: number) => void
  onEnded?: () => void
}

type DeckChannel = {
  element: HTMLAudioElement
  source: MediaElementAudioSourceNode
  inputGain: GainNode
  low: BiquadFilterNode
  mid: BiquadFilterNode
  high: BiquadFilterNode
  channelGain: GainNode
  crossfadeGain: GainNode
  objectUrl: string | null
}

export class AudioEngine {
  readonly context: AudioContext
  private readonly masterGain: GainNode
  private readonly decks: Record<DeckId, DeckChannel>
  private initialized = false

  constructor() {
    this.context = new AudioContext({ latencyHint: 'interactive' })
    this.masterGain = this.context.createGain()
    this.masterGain.gain.value = 0.9
    this.masterGain.connect(this.context.destination)

    this.decks = {
      A: this.createDeckChannel(),
      B: this.createDeckChannel(),
    }

    this.setCrossfader(0)
  }

  private createDeckChannel(): DeckChannel {
    const element = new Audio()
    element.preload = 'metadata'

    const source = this.context.createMediaElementSource(element)
    const inputGain = this.context.createGain()
    const low = this.createEqBand('lowshelf', 180)
    const mid = this.createEqBand('peaking', 1_200, 0.8)
    const high = this.createEqBand('highshelf', 6_500)
    const channelGain = this.context.createGain()
    const crossfadeGain = this.context.createGain()

    source
      .connect(inputGain)
      .connect(low)
      .connect(mid)
      .connect(high)
      .connect(channelGain)
      .connect(crossfadeGain)
      .connect(this.masterGain)

    return {
      element,
      source,
      inputGain,
      low,
      mid,
      high,
      channelGain,
      crossfadeGain,
      objectUrl: null,
    }
  }

  private createEqBand(type: BiquadFilterType, frequency: number, q?: number): BiquadFilterNode {
    const filter = this.context.createBiquadFilter()
    filter.type = type
    filter.frequency.value = frequency
    filter.gain.value = 0
    if (q !== undefined) filter.Q.value = q
    return filter
  }

  async initialize(): Promise<void> {
    if (this.context.state === 'suspended') await this.context.resume()
    this.initialized = true
  }

  isReady(): boolean {
    return this.initialized && this.context.state === 'running'
  }

  async loadFile(deckId: DeckId, file: File, callbacks: DeckCallbacks = {}): Promise<void> {
    const deck = this.decks[deckId]
    deck.element.pause()

    if (deck.objectUrl) URL.revokeObjectURL(deck.objectUrl)

    const objectUrl = URL.createObjectURL(file)
    deck.objectUrl = objectUrl
    deck.element.src = objectUrl
    deck.element.currentTime = 0

    deck.element.ontimeupdate = () => {
      callbacks.onTimeUpdate?.(deck.element.currentTime, Number.isFinite(deck.element.duration) ? deck.element.duration : 0)
    }
    deck.element.onloadedmetadata = () => {
      callbacks.onTimeUpdate?.(0, Number.isFinite(deck.element.duration) ? deck.element.duration : 0)
    }
    deck.element.onended = () => callbacks.onEnded?.()
    deck.element.load()
  }

  async play(deckId: DeckId): Promise<void> {
    await this.initialize()
    await this.decks[deckId].element.play()
  }

  pause(deckId: DeckId): void {
    this.decks[deckId].element.pause()
  }

  seek(deckId: DeckId, seconds: number): void {
    const element = this.decks[deckId].element
    if (!Number.isFinite(element.duration)) return
    element.currentTime = Math.min(element.duration, Math.max(0, seconds))
  }

  setDeckVolume(deckId: DeckId, value: number): void {
    const gain = Math.min(1, Math.max(0, value))
    this.decks[deckId].channelGain.gain.setTargetAtTime(gain, this.context.currentTime, 0.01)
  }

  setEq(deckId: DeckId, band: 'low' | 'mid' | 'high', value: number): void {
    const gain = Math.min(12, Math.max(-24, value))
    this.decks[deckId][band].gain.setTargetAtTime(gain, this.context.currentTime, 0.01)
  }

  setCrossfader(value: number): void {
    const gains = calculateCrossfaderGains(value)
    this.decks.A.crossfadeGain.gain.setTargetAtTime(gains.a, this.context.currentTime, 0.01)
    this.decks.B.crossfadeGain.gain.setTargetAtTime(gains.b, this.context.currentTime, 0.01)
  }

  async close(): Promise<void> {
    for (const deck of Object.values(this.decks)) {
      deck.element.pause()
      if (deck.objectUrl) URL.revokeObjectURL(deck.objectUrl)
    }
    if (this.context.state !== 'closed') await this.context.close()
  }
}

let engine: AudioEngine | null = null

export function getAudioEngine(): AudioEngine {
  if (!engine) engine = new AudioEngine()
  return engine
}
