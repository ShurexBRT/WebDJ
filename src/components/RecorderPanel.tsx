import { Circle, Download, Pause, Play, Square, Trash2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { getAudioEngine } from '../audio/AudioEngine'
import {
  createMixFileName,
  getMasterRecordingStream,
  isMixRecordingSupported,
  MixRecorder,
  selectRecorderMimeType,
} from '../audio/recording'
import { formatTime } from '../audio/transport'
import { useRecorderStore } from '../state/recorderStore'
import './recorder.css'

export function RecorderPanel() {
  const status = useRecorderStore((state) => state.status)
  const elapsedSeconds = useRecorderStore((state) => state.elapsedSeconds)
  const downloadUrl = useRecorderStore((state) => state.downloadUrl)
  const fileName = useRecorderStore((state) => state.fileName)
  const error = useRecorderStore((state) => state.error)
  const setStatus = useRecorderStore((state) => state.setStatus)
  const setElapsedSeconds = useRecorderStore((state) => state.setElapsedSeconds)
  const setRecordingResult = useRecorderStore((state) => state.setRecordingResult)
  const setError = useRecorderStore((state) => state.setError)
  const reset = useRecorderStore((state) => state.reset)
  const recorderRef = useRef<MixRecorder | null>(null)
  const supported = isMixRecordingSupported()
  const mimeType = supported ? selectRecorderMimeType() || 'browser default' : 'unsupported'

  useEffect(() => {
    if (status !== 'recording') return
    const interval = window.setInterval(() => setElapsedSeconds(useRecorderStore.getState().elapsedSeconds + 1), 1_000)
    return () => window.clearInterval(interval)
  }, [setElapsedSeconds, status])

  useEffect(() => () => {
    const url = useRecorderStore.getState().downloadUrl
    if (url) URL.revokeObjectURL(url)
  }, [])

  const start = async () => {
    if (!supported) return
    try {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl)
      reset()
      const engine = getAudioEngine()
      await engine.initialize()
      const recorder = new MixRecorder(getMasterRecordingStream(engine))
      recorderRef.current = recorder
      recorder.start()
      setStatus('recording')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to start mix recording')
    }
  }

  const togglePause = () => {
    const recorder = recorderRef.current
    if (!recorder) return
    if (status === 'recording') {
      recorder.pause()
      setStatus('paused')
    } else if (status === 'paused') {
      recorder.resume()
      setStatus('recording')
    }
  }

  const stop = async () => {
    const recorder = recorderRef.current
    if (!recorder) return
    try {
      const result = await recorder.stop()
      const url = URL.createObjectURL(result.blob)
      const name = createMixFileName(result.extension)
      recorderRef.current = null
      setRecordingResult(url, name)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to finish mix recording')
    }
  }

  const clear = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    recorderRef.current = null
    reset()
  }

  return (
    <section className={`recorder-panel recorder-${status}`} id="recorder-panel" aria-label="Master mix recorder">
      <div className="recorder-title">
        <span><Circle size={11} fill="currentColor" /> MASTER RECORDER</span>
        <strong>{formatTime(elapsedSeconds)}</strong>
        <small>{mimeType}</small>
      </div>
      <div className="recorder-controls">
        <button type="button" className="record-start" aria-label="Start mix recording" disabled={!supported || status === 'recording' || status === 'paused'} onClick={start}><Circle size={14} fill="currentColor" /> REC</button>
        <button type="button" aria-label={status === 'paused' ? 'Resume mix recording' : 'Pause mix recording'} disabled={status !== 'recording' && status !== 'paused'} onClick={togglePause}>{status === 'paused' ? <Play size={14} /> : <Pause size={14} />}{status === 'paused' ? 'RESUME' : 'PAUSE'}</button>
        <button type="button" aria-label="Stop mix recording" disabled={status !== 'recording' && status !== 'paused'} onClick={stop}><Square size={13} fill="currentColor" /> STOP</button>
        {downloadUrl && fileName ? <a className="recorder-download" href={downloadUrl} download={fileName}><Download size={14} /> DOWNLOAD MIX</a> : <span className="recorder-placeholder">{supported ? 'Record the processed master output' : 'MediaRecorder is unavailable in this browser'}</span>}
        <button type="button" className="recorder-clear" aria-label="Clear recorded mix" disabled={!downloadUrl && status === 'idle'} onClick={clear}><Trash2 size={14} /></button>
      </div>
      {error && <p role="alert">{error}</p>}
    </section>
  )
}
