import { beforeEach, describe, expect, it } from 'vitest'
import { useLibraryStore } from './libraryStore'

describe('library store', () => {
  beforeEach(() => useLibraryStore.setState({ tracks: [], isImporting: false, deckRequests: { A: null, B: null } }))

  it('imports audio files, ignores non-audio files and deduplicates content', async () => {
    const first = new File(['audio'], 'Artist - First.mp3', { type: 'audio/mpeg' })
    const duplicate = new File(['audio'], 'Artist - First.mp3', { type: 'audio/mpeg', lastModified: 9_999 })
    const ignored = new File(['text'], 'notes.txt', { type: 'text/plain' })

    await useLibraryStore.getState().addFiles([first, duplicate, ignored])

    expect(useLibraryStore.getState().tracks).toHaveLength(1)
    expect(useLibraryStore.getState().tracks[0]).toMatchObject({ artist: 'Artist', title: 'First' })
  })

  it('queues and consumes independent deck load requests', async () => {
    await useLibraryStore.getState().addFiles([new File(['audio'], 'Track.wav', { type: 'audio/wav' })])
    const trackId = useLibraryStore.getState().tracks[0].id

    useLibraryStore.getState().requestDeckLoad('B', trackId)
    const request = useLibraryStore.getState().deckRequests.B
    expect(request?.track.id).toBe(trackId)
    expect(useLibraryStore.getState().deckRequests.A).toBeNull()

    useLibraryStore.getState().consumeDeckRequest('B', request!.requestId)
    expect(useLibraryStore.getState().deckRequests.B).toBeNull()
  })
})
