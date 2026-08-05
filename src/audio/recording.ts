import type { AudioEngine } from './AudioEngine'

export const RECORDER_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/ogg;codecs=opus',
  'audio/webm',
] as const

export type RecorderMimeType = typeof RECORDER_MIME_TYPES[number] | ''

export type RecordedMix = {
  blob: Blob
  mimeType: string
  extension: 'webm' | 'ogg'
  durationMs: number
}

type RecorderEngineInternals = {
  masterDestination: MediaStreamAudioDestinationNode
}

export function getMasterRecordingStream(engine: AudioEngine): MediaStream {
  return (engine as unknown as RecorderEngineInternals).masterDestination.stream
}

export function selectRecorderMimeType(
  isTypeSupported: (mimeType: string) => boolean = (mimeType) => MediaRecorder.isTypeSupported(mimeType),
): RecorderMimeType {
  return RECORDER_MIME_TYPES.find((mimeType) => isTypeSupported(mimeType)) ?? ''
}

export function isMixRecordingSupported(): boolean {
  return typeof MediaRecorder !== 'undefined'
}

export class MixRecorder {
  private readonly recorder: MediaRecorder
  private readonly chunks: BlobPart[] = []
  private startedAt = 0

  constructor(stream: MediaStream) {
    if (!isMixRecordingSupported()) throw new Error('Mix recording is not supported in this browser')
    const mimeType = selectRecorderMimeType()
    this.recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.chunks.push(event.data)
    }
  }

  get state(): RecordingState {
    return this.recorder.state
  }

  start(): void {
    if (this.recorder.state !== 'inactive') return
    this.chunks.length = 0
    this.startedAt = Date.now()
    this.recorder.start(1_000)
  }

  pause(): void {
    if (this.recorder.state === 'recording') this.recorder.pause()
  }

  resume(): void {
    if (this.recorder.state === 'paused') this.recorder.resume()
  }

  stop(): Promise<RecordedMix> {
    if (this.recorder.state === 'inactive') return Promise.reject(new Error('Recorder is not running'))

    return new Promise((resolve, reject) => {
      this.recorder.onerror = () => reject(new Error('The browser failed to record the master mix'))
      this.recorder.onstop = () => {
        const mimeType = this.recorder.mimeType || 'audio/webm'
        resolve({
          blob: new Blob(this.chunks, { type: mimeType }),
          mimeType,
          extension: mimeType.includes('ogg') ? 'ogg' : 'webm',
          durationMs: Math.max(0, Date.now() - this.startedAt),
        })
      }
      this.recorder.stop()
    })
  }
}

export function createMixFileName(extension: 'webm' | 'ogg', date = new Date()): string {
  const timestamp = date.toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '')
  return `webdj-mix_${timestamp}.${extension}`
}
