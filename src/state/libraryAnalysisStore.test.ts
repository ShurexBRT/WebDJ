import { beforeEach, describe, expect, it } from 'vitest'
import { useLibraryAnalysisStore } from './libraryAnalysisStore'

describe('library analysis queue store', () => {
  beforeEach(() => useLibraryAnalysisStore.getState().reset())

  it('queues tracks and advances one item through analysis completion', () => {
    const store = useLibraryAnalysisStore.getState()
    store.enqueue(['one', 'two'])
    expect(useLibraryAnalysisStore.getState().items).toMatchObject({
      one: { status: 'queued' },
      two: { status: 'queued' },
    })

    useLibraryAnalysisStore.getState().start('one', 'Track One')
    expect(useLibraryAnalysisStore.getState()).toMatchObject({
      activeTrackId: 'one',
      activeTrackTitle: 'Track One',
    })

    useLibraryAnalysisStore.getState().succeed('one')
    expect(useLibraryAnalysisStore.getState()).toMatchObject({
      activeTrackId: null,
      activeTrackTitle: '',
      lastUpdatedTrackId: 'one',
      revision: 1,
    })
    expect(useLibraryAnalysisStore.getState().items.one.status).toBe('ready')
  })

  it('keeps failures explicit, retries them and drops removed library ids', () => {
    const store = useLibraryAnalysisStore.getState()
    store.enqueue(['one', 'two'])
    useLibraryAnalysisStore.getState().start('two', 'Track Two')
    useLibraryAnalysisStore.getState().fail('two', 'decode failed')
    expect(useLibraryAnalysisStore.getState().items.two).toEqual({ status: 'failed', error: 'decode failed' })

    useLibraryAnalysisStore.getState().retryFailed()
    expect(useLibraryAnalysisStore.getState().items.two).toEqual({ status: 'queued', error: null })

    useLibraryAnalysisStore.getState().removeMissing(['two'])
    expect(useLibraryAnalysisStore.getState().items.one).toBeUndefined()
    expect(useLibraryAnalysisStore.getState().items.two.status).toBe('queued')
  })
})
