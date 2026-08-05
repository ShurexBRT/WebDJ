export type DeckId = 'A' | 'B'

export interface DeckAudioNodes {
  source: AudioBufferSourceNode | MediaElementAudioSourceNode | null
  inputGain: GainNode
  low: BiquadFilterNode
  mid: BiquadFilterNode
  high: BiquadFilterNode
  filter: BiquadFilterNode
  channelGain: GainNode
  crossfadeGain: GainNode
  cueGain: GainNode
}

export class AudioEngine {
  readonly context: AudioContext
  private initialized = false

  constructor() {
    this.context = new AudioContext({ latencyHint: 'interactive' })
  }

  async initialize(): Promise<void> {
    if (this.context.state === 'suspended') {
      await this.context.resume()
    }
    this.initialized = true
  }

  isReady(): boolean {
    return this.initialized && this.context.state === 'running'
  }

  async close(): Promise<void> {
    if (this.context.state !== 'closed') {
      await this.context.close()
    }
  }
}
