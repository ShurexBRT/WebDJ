import { BufferDeckTransport } from './BufferDeckTransport'
import { calculateCrossfaderGains } from './crossfader'
import { clampFxMix, delaySecondsFromMs, feedbackGain, filterFrequencyFromPosition } from './fx'
import { decibelsToGain, readAnalyserLevel } from './meter'
import { nudgePlaybackRate, type NudgeDirection } from './phaseSync'
import { calculateMonitorGains, getOutputSupport, normalizeAudioOutputs, type AudioOutputDevice } from './routing'
import { playbackRateFromPitch } from './tempo'
import type { DeckId } from '../state/mixerStore'

type DeckCallbacks = {
  onTimeUpdate?: (currentTime: number, duration: number) => void
  onEnded?: () => void
}

type SinkAudioElement = HTMLAudioElement & {
  setSinkId?: (deviceId: string) => Promise<void>
}

type DeckChannel = {
  transport: BufferDeckTransport
  inputGain: GainNode
  low: BiquadFilterNode
  mid: BiquadFilterNode
  high: BiquadFilterNode
  filter: BiquadFilterNode
  dryGain: GainNode
  echoSend: GainNode
  echoDelay: DelayNode
  echoFeedback: GainNode
  reverbSend: GainNode
  reverb: ConvolverNode
  fxReturn: GainNode
  analyser: AnalyserNode
  meterBuffer: Uint8Array<ArrayBuffer>
  channelGain: GainNode
  crossfadeGain: GainNode
  cueGain: GainNode
  basePlaybackRate: number
  nudgeTimer: number | null
}

export class AudioEngine {
  readonly context: AudioContext
  private readonly masterGain: GainNode
  private readonly masterInputAnalyser: AnalyserNode
  private readonly masterInputMeterBuffer: Uint8Array<ArrayBuffer>
  private readonly masterLimiter: DynamicsCompressorNode
  private readonly masterAnalyser: AnalyserNode
  private readonly masterMeterBuffer: Uint8Array<ArrayBuffer>
  private readonly masterDestination: MediaStreamAudioDestinationNode
  private readonly cueDestination: MediaStreamAudioDestinationNode
  private readonly cueBus: GainNode
  private readonly cueMonitorGain: GainNode
  private readonly masterMonitorGain: GainNode
  private readonly cueOutputGain: GainNode
  private readonly masterOutput: SinkAudioElement
  private readonly cueOutput: SinkAudioElement
  private readonly decks: Record<DeckId, DeckChannel>
  private initialized = false

  constructor() {
    this.context = new AudioContext({ latencyHint: 'interactive' })
    this.masterGain = this.context.createGain()
    this.masterGain.gain.value = 0.9
    this.masterInputAnalyser = this.createAnalyser()
    this.masterInputMeterBuffer = new Uint8Array(new ArrayBuffer(this.masterInputAnalyser.fftSize))
    this.masterLimiter = this.context.createDynamicsCompressor()
    this.masterLimiter.threshold.value = -1
    this.masterLimiter.knee.value = 0
    this.masterLimiter.ratio.value = 20
    this.masterLimiter.attack.value = 0.003
    this.masterLimiter.release.value = 0.1
    this.masterAnalyser = this.createAnalyser()
    this.masterMeterBuffer = new Uint8Array(new ArrayBuffer(this.masterAnalyser.fftSize))

    this.masterDestination = this.context.createMediaStreamDestination()
    this.cueDestination = this.context.createMediaStreamDestination()
    this.cueBus = this.context.createGain()
    this.cueMonitorGain = this.context.createGain()
    this.masterMonitorGain = this.context.createGain()
    this.cueOutputGain = this.context.createGain()

    this.masterOutput = this.createOutputElement(this.masterDestination.stream)
    this.cueOutput = this.createOutputElement(this.cueDestination.stream)

    this.masterGain.connect(this.masterInputAnalyser)
    this.masterInputAnalyser.connect(this.masterLimiter)
    this.masterLimiter.connect(this.masterAnalyser)
    this.masterAnalyser.connect(this.masterDestination)
    this.masterAnalyser.connect(this.masterMonitorGain)
    this.masterMonitorGain.connect(this.cueOutputGain)
    this.cueBus.connect(this.cueMonitorGain)
    this.cueMonitorGain.connect(this.cueOutputGain)
    this.cueOutputGain.connect(this.cueDestination)

    this.decks = {
      A: this.createDeckChannel(),
      B: this.createDeckChannel(),
    }

    this.setCrossfader(0)
    this.setCueVolume(0.8)
    this.setCueMix(0)
  }

  private createOutputElement(stream: MediaStream): SinkAudioElement {
    const output = new Audio() as SinkAudioElement
    output.autoplay = true
    output.srcObject = stream
    return output
  }

  private createAnalyser(): AnalyserNode {
    const analyser = this.context.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.72
    return analyser
  }

  private createImpulse(seconds = 2.2, decay = 2.8): AudioBuffer {
    const length = Math.floor(this.context.sampleRate * seconds)
    const impulse = this.context.createBuffer(2, length, this.context.sampleRate)
    for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
      const data = impulse.getChannelData(channel)
      for (let index = 0; index < length; index += 1) {
        const envelope = Math.pow(1 - index / length, decay)
        data[index] = (Math.random() * 2 - 1) * envelope
      }
    }
    return impulse
  }

  private createDeckChannel(): DeckChannel {
    const inputGain = this.context.createGain()
    const low = this.createEqBand('lowshelf', 180)
    const mid = this.createEqBand('peaking', 1_200, 0.8)
    const high = this.createEqBand('highshelf', 6_500)
    const filter = this.createEqBand('lowpass', 20_000, 0.7)
    const dryGain = this.context.createGain()
    const echoSend = this.context.createGain()
    const echoDelay = this.context.createDelay(4)
    const echoFeedback = this.context.createGain()
    const reverbSend = this.context.createGain()
    const reverb = this.context.createConvolver()
    const fxReturn = this.context.createGain()
    const analyser = this.createAnalyser()
    const meterBuffer = new Uint8Array(new ArrayBuffer(analyser.fftSize))
    const channelGain = this.context.createGain()
    const crossfadeGain = this.context.createGain()
    const cueGain = this.context.createGain()
    const transport = new BufferDeckTransport(this.context, inputGain)

    filter.frequency.value = 20_000
    dryGain.gain.value = 1
    echoSend.gain.value = 0
    echoDelay.delayTime.value = 0.375
    echoFeedback.gain.value = 0.35
    reverbSend.gain.value = 0
    reverb.buffer = this.createImpulse()
    fxReturn.gain.value = 1
    cueGain.gain.value = 0

    inputGain.connect(low).connect(mid).connect(high).connect(filter)
    filter.connect(dryGain)
    filter.connect(echoSend).connect(echoDelay).connect(echoFeedback).connect(echoDelay)
    echoDelay.connect(fxReturn)
    filter.connect(reverbSend).connect(reverb).connect(fxReturn)
    dryGain.connect(analyser)
    fxReturn.connect(analyser)
    analyser.connect(channelGain).connect(crossfadeGain).connect(this.masterGain)
    filter.connect(cueGain).connect(this.cueBus)

    return {
      transport,
      inputGain,
      low,
      mid,
      high,
      filter,
      dryGain,
      echoSend,
      echoDelay,
      echoFeedback,
      reverbSend,
      reverb,
      fxReturn,
      analyser,
      meterBuffer,
      channelGain,
      crossfadeGain,
      cueGain,
      basePlaybackRate: 1,
      nudgeTimer: null,
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
    await Promise.allSettled([this.masterOutput.play(), this.cueOutput.play()])
    this.initialized = true
  }

  isReady(): boolean {
    return this.initialized && this.context.state === 'running'
  }

  async requestOutputAccess(): Promise<AudioOutputDevice[]> {
    if (!navigator.mediaDevices) return []

    let stream: MediaStream | null = null
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      // Device labels can still be partially available without microphone permission.
    } finally {
      stream?.getTracks().forEach((track) => track.stop())
    }

    return this.listOutputDevices()
  }

  async listOutputDevices(): Promise<AudioOutputDevice[]> {
    if (!navigator.mediaDevices?.enumerateDevices) return []
    const devices = await navigator.mediaDevices.enumerateDevices()
    return normalizeAudioOutputs(devices)
  }

  getOutputSupport() {
    return getOutputSupport()
  }

  async setMasterOutput(deviceId: string): Promise<void> {
    if (!this.masterOutput.setSinkId) throw new Error('Output selection is not supported in this browser')
    await this.masterOutput.setSinkId(deviceId)
  }

  async setCueOutput(deviceId: string): Promise<void> {
    if (!this.cueOutput.setSinkId) throw new Error('Output selection is not supported in this browser')
    await this.cueOutput.setSinkId(deviceId)
  }

  async loadFile(deckId: DeckId, file: File, callbacks: DeckCallbacks = {}): Promise<void> {
    const deck = this.decks[deckId]
    if (deck.nudgeTimer !== null) {
      window.clearTimeout(deck.nudgeTimer)
      deck.nudgeTimer = null
    }
    deck.transport.setPlaybackRate(deck.basePlaybackRate)
    await deck.transport.loadFile(file, callbacks)
  }

  async play(deckId: DeckId): Promise<boolean> {
    await this.initialize()
    return this.decks[deckId].transport.play()
  }

  pause(deckId: DeckId): void {
    this.decks[deckId].transport.pause()
  }

  seek(deckId: DeckId, seconds: number): void {
    this.decks[deckId].transport.seek(seconds)
  }

  setDeckPitch(deckId: DeckId, pitchPercent: number): void {
    const deck = this.decks[deckId]
    if (deck.nudgeTimer !== null) {
      window.clearTimeout(deck.nudgeTimer)
      deck.nudgeTimer = null
    }
    deck.basePlaybackRate = playbackRateFromPitch(pitchPercent)
    deck.transport.setPlaybackRate(deck.basePlaybackRate)
  }

  nudgeDeck(deckId: DeckId, direction: NudgeDirection, amountPercent = 4, durationMs = 180): void {
    const deck = this.decks[deckId]
    if (deck.nudgeTimer !== null) window.clearTimeout(deck.nudgeTimer)
    deck.transport.setPlaybackRate(nudgePlaybackRate(deck.basePlaybackRate, direction, amountPercent))
    deck.nudgeTimer = window.setTimeout(() => {
      deck.transport.setPlaybackRate(deck.basePlaybackRate)
      deck.nudgeTimer = null
    }, Math.max(40, durationMs))
  }

  getDeckCurrentTime(deckId: DeckId): number {
    return this.decks[deckId].transport.getCurrentTime()
  }

  setDeckTrim(deckId: DeckId, decibels: number): void {
    this.decks[deckId].inputGain.gain.setTargetAtTime(decibelsToGain(decibels), this.context.currentTime, 0.01)
  }

  setDeckVolume(deckId: DeckId, value: number): void {
    const gain = Math.min(1, Math.max(0, value))
    this.decks[deckId].channelGain.gain.setTargetAtTime(gain, this.context.currentTime, 0.01)
  }

  setDeckFilter(deckId: DeckId, position: number): void {
    const deck = this.decks[deckId]
    const safe = Math.min(1, Math.max(-1, position))
    deck.filter.type = safe >= 0 ? 'highpass' : 'lowpass'
    deck.filter.frequency.setTargetAtTime(filterFrequencyFromPosition(safe), this.context.currentTime, 0.015)
    deck.filter.Q.setTargetAtTime(0.7 + Math.abs(safe) * 5, this.context.currentTime, 0.015)
  }

  setDeckEcho(deckId: DeckId, options: { enabled: boolean; mix: number; timeMs: number; feedback: number }): void {
    const deck = this.decks[deckId]
    deck.echoSend.gain.setTargetAtTime(options.enabled ? clampFxMix(options.mix) : 0, this.context.currentTime, 0.02)
    deck.echoDelay.delayTime.setTargetAtTime(delaySecondsFromMs(options.timeMs), this.context.currentTime, 0.02)
    deck.echoFeedback.gain.setTargetAtTime(feedbackGain(options.feedback), this.context.currentTime, 0.02)
  }

  setDeckReverb(deckId: DeckId, options: { enabled: boolean; mix: number }): void {
    this.decks[deckId].reverbSend.gain.setTargetAtTime(options.enabled ? clampFxMix(options.mix) : 0, this.context.currentTime, 0.02)
  }

  setMasterVolume(value: number): void {
    const gain = Math.min(1, Math.max(0, value))
    this.masterGain.gain.setTargetAtTime(gain, this.context.currentTime, 0.01)
  }

  getDeckLevel(deckId: DeckId): number {
    const deck = this.decks[deckId]
    return readAnalyserLevel(deck.analyser, deck.meterBuffer)
  }

  getMasterPreLimiterLevel(): number {
    return readAnalyserLevel(this.masterInputAnalyser, this.masterInputMeterBuffer)
  }

  getMasterLimiterReduction(): number {
    return Math.max(0, -(this.masterLimiter.reduction ?? 0))
  }

  getMasterLevel(): number {
    return readAnalyserLevel(this.masterAnalyser, this.masterMeterBuffer)
  }

  setDeckCue(deckId: DeckId, enabled: boolean): void {
    this.decks[deckId].cueGain.gain.setTargetAtTime(enabled ? 1 : 0, this.context.currentTime, 0.01)
  }

  setCueVolume(value: number): void {
    const gain = Math.min(1, Math.max(0, value))
    this.cueOutputGain.gain.setTargetAtTime(gain, this.context.currentTime, 0.01)
  }

  setCueMix(value: number): void {
    const gains = calculateMonitorGains(value)
    this.cueMonitorGain.gain.setTargetAtTime(gains.cue, this.context.currentTime, 0.01)
    this.masterMonitorGain.gain.setTargetAtTime(gains.master, this.context.currentTime, 0.01)
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
      if (deck.nudgeTimer !== null) window.clearTimeout(deck.nudgeTimer)
      deck.transport.dispose()
    }
    this.masterOutput.pause()
    this.cueOutput.pause()
    if (this.context.state !== 'closed') await this.context.close()
  }
}

let engine: AudioEngine | null = null

export function getAudioEngine(): AudioEngine {
  if (!engine) engine = new AudioEngine()
  return engine
}
