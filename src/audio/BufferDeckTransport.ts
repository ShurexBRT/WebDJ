import soundTouchProcessorUrl from '@soundtouchjs/audio-worklet/processor?url'
import { clampTransportTime, reanchorTransportClock, transportPositionAt, type TransportClock } from './bufferTransport'

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

const registrationByContext = new WeakMap<AudioContext, Promise<void>>()
let soundTouchConstructor: SoundTouchNodeConstructor | null = null
let soundTouchConstructorPromise: Promise<SoundTouchNodeConstructor> | null = null

async function loadSoundTouchConstructor(): Promise<SoundTouchNodeConstructor> {
  if (soundTouchConstructor) return soundTouchConstructor
  if (soundTouchConstructorPromise) return soundTouchConstructorPromise

  const pending = import('@soundtouchjs/audio-worklet')
    .then(({ SoundTouchNode }) => {
      const constructor = SoundTouchNode as unknown as SoundTouchNodeConstructor
      soundTouchConstructor = constructor
      return constructor
    })
    .catch((error): never => {
      soundTouchConstructorPromise = null
      throw error
    })

  soundTouchConstructorPromise = pending
  return pending
}

async function registerSoundTouch(context: AudioContext): Promise<void> {
  const existing = registrationByContext.get(context)
  if (existing) return existing

  const registration = loadSoundTouchConstructor()
    .then((Constructor) => Constructor.register(context, soundTouchProcessorUrl))
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
    if (!this.buffer || this.clock.playing) return false
    if (this.clock.offsetSeconds >= this.buffer.duration) this.clock.offsetSeconds = 0
    if (this.context.state === 'suspended') await this.context.resume()
    await registerSoundTouch(this.context)
    this.startSource(this.clock.offsetSeconds)
    return true
  }

  pause(): void {
    if (!this.clock.playing) return
    this.clock = {
      ...reanchorTransportClock(this.clock, this.context.currentTime),
      playing: false,
    }
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
    if (this.clock.playing) {
      this.clock = reanchorTransportClock(this.clock, this.context.currentTime, nextRate)
    } else {
      this.clock = { ...this.clock, playbackRate: nextRate }
    }

    if (this.source && this.processor) {
      this.source.playbackRate.setValueAtTime(nextRate, this.context.currentTime)
      this.processor.playbackRate.setValueAtTime(nextRate, this.context.currentTime)
      this.processor.pitch.setValueAtTime(1, this.context.currentTime)
    }
    this.emitTimeUpdate()
  }

  getCurrentTime(): number {
    return transportPositionAt(this.clock, this.context.currentTime)
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
    this.clock = {
      offsetSeconds: 0,
      anchorContextTime: this.context.currentTime,
      playbackRate: 1,
      durationSeconds: 0,
      playing: false,
    }
  }

  private startSource(offsetSeconds: number): void {
    if (!this.buffer) return
    const Constructor = soundTouchConstructor
    if (!Constructor) throw new Error('SoundTouch worklet is not registered')

    this.stopCurrentSource()

    const generation = ++this.sourceGeneration
    const source = this.context.createBufferSource()
    const processor = new Constructor({ context: this.context })
    const rate = this.clock.playbackRate

    source.buffer = this.buffer
    source.playbackRate.setValueAtTime(rate, this.context.currentTime)
    processor.playbackRate.setValueAtTime(rate, this.context.currentTime)
    processor.pitch.setValueAtTime(1, this.context.currentTime)
    source.connect(processor)
    processor.connect(this.destination)

    source.onended = () => {
      if (generation !== this.sourceGeneration || !this.clock.playing) return
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
    this.clock = {
      ...this.clock,
      offsetSeconds,
      anchorContextTime: this.context.currentTime,
      playing: true,
    }
    source.start(0, offsetSeconds)
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
