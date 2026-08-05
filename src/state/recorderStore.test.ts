import { beforeEach, describe, expect, it } from 'vitest'
import { useRecorderStore } from './recorderStore'

describe('recorder store', () => {
  beforeEach(() => useRecorderStore.getState().reset())

  it('tracks recording time and a finished download', () => {
    useRecorderStore.getState().setStatus('recording')
    useRecorderStore.getState().setElapsedSeconds(12)
    useRecorderStore.getState().setRecordingResult('blob:mix', 'mix.webm')

    expect(useRecorderStore.getState()).toMatchObject({
      status: 'ready',
      elapsedSeconds: 12,
      downloadUrl: 'blob:mix',
      fileName: 'mix.webm',
      error: null,
    })
  })

  it('resets errors and stale results', () => {
    useRecorderStore.getState().setError('failed')
    expect(useRecorderStore.getState().status).toBe('error')
    useRecorderStore.getState().reset()
    expect(useRecorderStore.getState()).toMatchObject({
      status: 'idle',
      elapsedSeconds: 0,
      downloadUrl: null,
      fileName: null,
      error: null,
    })
  })
})
