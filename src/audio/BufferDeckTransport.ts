import { SoundTouchNode } from '@soundtouchjs/audio-worklet'
import soundTouchProcessorUrl from '@soundtouchjs/audio-worklet/processor?url'
import { clampTransportTime, loopedTransportPositionAt, type TransportClock, type TransportLoopRange } from './bufferTransport'
import { SlipTimeline } from './slipTimeline'

type BufferTransportCallbacks = {
  onTimeUpdate?: (currentTime: number, duration: number) => void
  onEnded?: () => void
}

type AnimationFrameScheduler = {
  request: (callback: FrameRequestCallback) => number
  cancel: (id: number) => void
}

type SoundTouchProcessorNode = AudioNode & {
  playbackRate: AudioParam
  pitch: AudioParam
}

type SoundTouchNodeConstructor = {
  new (options: { context: AudioContext }): SoundTouchProcessorNode
  register: (context: AudioContext, processorUrl: string) => Promise<void>
}

const defaultScheduler: AnimationFrameScheduler = {
  request: (callback) => window.requestAnimationFrame(callback),
  cancel: (id) => window.cancelAnimationFrame(id),
}

const SoundTouchConstructor = SoundTouchNode as unknown as SoundTouchNodeConstructor
const registrationByContext = new WeakMap<AudioContext, Promise<void>>()

async function registerSoundTouch(context: AudioContext): Promise<void> {
  const existing = registrationByContext.get(context)
  if (existing) return existing

  const registration = SoundTouchConstructor.register(context, soundTouchProcessorUrl)
  registrationByContext.set(context, registration)
  try {
    await registration
  } catch (error) {
    registrationByContext.delete(context)
    throw error
  }
}

export class BufferDeckTransport {
  private buffer: AudioBuffer | null = null
  private source: AudioBufferSourceNode | null = null
  private processor: SoundTouchProcessorNode | null = null
  private callbacks: BufferTransportCallbacks = {}
  private loopRange: TransportLoopRange | null = null
  private readonly slipTimeline = new SlipTimeline()
  private frameId: number | null = null
  private sourceGeneration = 0
  private clock: TransportClock = {
    offsetSeconds: 0,
    anchorContextTime: 0,
    playbackRate: 1,
    durationSeconds: 0,
    playing: false,
  }

  constructor(
    private readonly context: AudioContext,
    private readonly destination: AudioNode,
    private readonly scheduler: AnimationFrameScheduler = defaultScheduler,
  ) {}

  async loadFile(file: File, callbacks: BufferTransportCallbacks = {}): Promise<AudioBuffer> {
    const arrayBuffer = await file.arrayBuffer()
    const audioBuffer = await this.context.decodeAudioData(arrayBuffer.slice(0))
    this.loadBuffer(audioBuffer, callbacks)
    return audioBuffer
  }

  loadBuffer(buffer: AudioBuffer, callbacks: BufferTransportCallbacks = {}): void {
    this.stopCurrentSource()
    this.stopTicker()
    this.buffer = buffer
    this.callbacks = callbacks
    this.loopRange = null
    this.slipTimeline.clear()
    this.clock = {
      offsetSeconds: 0,
      anchorContextTime: this.context.currentTime,
      playbackRate: this.clock.playbackRate,
      durationSeconds: buffer.duration,
      playing: false,
    }
    this.emitTimeUpdate()
  }

  async play(): Promise<boolean> {
    return this.playAt(this.context.currentTime)
  }

  async playAt(contextTime: number): Promise<boolean> {
    if (!this.buffer) throw new Error('No decoded audio is loaded')
    if (this.clock.playing) return false
    if (this.clock.offsetSeconds >= this.buffer.duration) this.clock.offsetSeconds = 0
    if (this.context.state === 'suspended') await this.context.resume()
    await registerSoundTouch(this.context)
    this.startSource(this.clock.offsetSeconds, Math.max(this.context.currentTime, contextTime))
    return true
  }

  pause(): void {
    if (!this.clock.playing) return
    this.slipTimeline.clear()
    this.reanchorClock(this.clock.playbackRate, false)
    this.stopCurrentSource()
    this.stopTicker()
    this.emitTimeUpdate()
  }

  seek(seconds: number): void {
    if (!this.buffer) return
    const wasPlaying = this.clock.playing
    const nextOffset = clampTransportTime(seconds, this.buffer.duration)
    this.clock = {
      ...this.clock,
      offsetSeconds: nextOffset,
      anchorContextTime: this.context.currentTime,
      playing: false,
    }
    this.stopCurrentSource()
    this.stopTicker()
    this.emitTimeUpdate()
    if (wasPlaying && nextOffset < this.buffer.duration) {
      void registerSoundTouch(this.context).then(() => this.startSource(nextOffset))
    }
  }

  setPlaybackRate(rate: number): void {
    const nextRate = Math.max(0.25, Math.min(4, rate))
    this.slipTimeline.setPlaybackRate(this.context.currentTime, nextRate)
    if (this.clock.playing) this.reanchorClock(nextRate, true)
    else this.clock = { ...this.clock, playbackRate: nextRate }

    if (this.source && this.processor) {
      this.source.playbackRate.setValueAtTime(nextRate, this.context.currentTime)
      this.processor.playbackRate.setValueAtTime(nextRate, this.context.currentTime)
      this.processor.pitch.setValueAtTime(1, this.context.currentTime)
    }
    this.emitTimeUpdate()
  }

  setLoop(range: { start: number; end: number } | null): void {
    const duration = this.getDuration()
    const currentTime = this.getCurrentTime()
    if (this.clock.playing) this.reanchorClock(this.clock.playbackRate, true)

    if (!range || duration <= 0) {
      this.loopRange = null
      if (this.source) this.source.loop = false
      this.emitTimeUpdate()
      return
    }

    const startSeconds = clampTransportTime(range.start, duration)
    const endSeconds = clampTransportTime(range.end, duration)
    if (endSeconds <= startSeconds) {
      this.loopRange = null
      if (this.source) this.source.loop = false
      this.emitTimeUpdate()
      return
    }

    this.loopRange = { startSeconds, endSeconds }
    if (currentTime >= endSeconds) {
      this.seek(startSeconds)
      return
    }

    this.applyLoopToSource()
    this.emitTimeUpdate()
  }

  beginSlip(owner: string): boolean {
    if (!this.buffer || !this.clock.playing) return false
    return this.slipTimeline.begin(
      owner,
      this.getCurrentTime(),
      this.context.currentTime,
      this.clock.playbackRate,
      this.buffer.duration,
    )
  }

  endSlip(owner: string): number | null {
    const release = this.slipTimeline.end(owner, this.context.currentTime)
    if (release.returnTime === null) return null
    const returnTime = clampTransportTime(release.returnTime, this.getDuration())
    this.seek(returnTime)
    return returnTime
  }

  cancelSlip(returnToTimeline: boolean): number | null {
    const release = this.slipTimeline.cancel(this.context.currentTime, returnToTimeline)
    if (release.returnTime === null) return null
    const returnTime = clampTransportTime(release.returnTime, this.getDuration())
    this.seek(returnTime)
    return returnTime
  }

  isSlipActive(): boolean {
    return this.slipTimeline.isActive()
  }

  getSlipHiddenTime(): number | null {
    return this.slipTimeline.hiddenPositionAt(this.context.currentTime)
  }

  getCurrentTime(): number {
    return loopedTransportPositionAt(this.clock, this.context.currentTime, this.loopRange)
  }

  getDuration(): number {
    return this.buffer?.duration ?? 0
  }

  getPlaybackRate(): number {
    return this.clock.playbackRate
  }

  isPlaying(): boolean {
    return this.clock.playing
  }

  dispose(): void {
    this.stopCurrentSource()
    this.stopTicker()
    this.buffer = null
    this.callbacks = {}
    this.loopRange = null
    this.slipTimeline.clear()
    this.clock = {
      offsetSeconds: 0,
      anchorContextTime: this.context.currentTime,
      playbackRate: 1,
      durationSeconds: 0,
      playing: false,
    }
  }

  private reanchorClock(playbackRate: number, playing: boolean): void {
    this.clock = {
      ...this.clock,
      offsetSeconds: this.getCurrentTime(),
      anchorContextTime: this.context.currentTime,
      playbackRate,
      playing,
    }
  }

  private applyLoopToSource(): void {
    if (!this.source) return
    if (!this.loopRange) {
      this.source.loop = false
      return
    }
    this.source.loopStart = this.loopRange.startSeconds
    this.source.loopEnd = this.loopRange.endSeconds
    this.source.loop = true
  }

  private startSource(offsetSeconds: number, startContextTime = this.context.currentTime): void {
    if (!this.buffer) return

    this.stopCurrentSource()

    const generation = ++this.sourceGeneration
    const source = this.context.createBufferSource()
    const processor = new SoundTouchConstructor({ context: this.context })
    const rate = this.clock.playbackRate

    source.buffer = this.buffer
    source.playbackRate.setValueAtTime(rate, this.context.currentTime)
    processor.playbackRate.setValueAtTime(rate, this.context.currentTime)
    processor.pitch.setValueAtTime(1, this.context.currentTime)
    source.connect(processor)
    processor.connect(this.destination)

    source.onended = () => {
      if (generation !== this.sourceGeneration || !this.clock.playing || this.loopRange) return
      if (this.slipTimeline.isActive()) {
        const returnTime = this.cancelSlip(true)
        if (returnTime !== null && returnTime < this.clock.durationSeconds) return
      }
      this.clock = {
        ...this.clock,
        offsetSeconds: this.clock.durationSeconds,
        anchorContextTime: this.context.currentTime,
        playing: false,
      }
      this.source = null
      this.processor?.disconnect()
      this.processor = null
      this.stopTicker()
      this.emitTimeUpdate()
      this.callbacks.onEnded?.()
    }

    this.source = source
    this.processor = processor
    this.applyLoopToSource()
    this.clock = {
      ...this.clock,
      offsetSeconds,
      anchorContextTime: startContextTime,
      playing: true,
    }
    source.start(startContextTime, offsetSeconds)
    this.startTicker()
    this.emitTimeUpdate()
  }

  private stopCurrentSource(): void {
    this.sourceGeneration += 1
    const source = this.source
    const processor = this.processor
    this.source = null
    this.processor = null

    if (source) {
      source.onended = null
      try {
        source.stop()
      } catch {
        // The node may already be stopped by the audio rendering thread.
      }
      source.disconnect()
    }
    processor?.disconnect()
  }

  private startTicker(): void {
    if (this.frameId !== null) return

    const tick: FrameRequestCallback = () => {
      this.frameId = null
      if (!this.clock.playing) return
      this.emitTimeUpdate()
      this.frameId = this.scheduler.request(tick)
    }
    this.frameId = this.scheduler.request(tick)
  }

  private stopTicker(): void {
    if (this.frameId === null) return
    this.scheduler.cancel(this.frameId)
    this.frameId = null
  }

  private emitTimeUpdate(): void {
    this.callbacks.onTimeUpdate?.(this.getCurrentTime(), this.getDuration())
  }
}
