import { beforeEach, describe, expect, it } from 'vitest'
import type { OnlineTrack } from '../online/types'
import { serializeLibraryTrack } from '../storage/libraryManifest'
import { useLibraryStore } from './libraryStore'

describe('library store', () => {
  beforeEach(() => useLibraryStore.setState({
    tracks: [],
    isImporting: false,
    manifestHydrated: false,
    deckRequests: { A: null, B: null },
  }))

  it('imports audio files, ignores non-audio files and deduplicates content', async () => {
    const first = new File(['audio'], 'Artist - First.mp3', { type: 'audio/mpeg' })
    const duplicate = new File(['audio'], 'Artist - First.mp3', { type: 'audio/mpeg', lastModified: 9_999 })
    const ignored = new File(['text'], 'notes.txt', { type: 'text/plain' })

    await useLibraryStore.getState().addFiles([first, duplicate, ignored])

    expect(useLibraryStore.getState().tracks).toHaveLength(1)
    expect(useLibraryStore.getState().tracks[0]).toMatchObject({ artist: 'Artist', title: 'First', source: 'local' })
  })

  it('adds online audio with source metadata before sending it to a deck', async () => {
    const onlineTrack: OnlineTrack = {
      source: 'jamendo',
      id: 'jam-1',
      title: 'Browser Track',
      artist: 'Web Artist',
      album: 'Open Album',
      genre: 'House',
      durationSeconds: 203,
      artworkUrl: 'https://example.test/cover.jpg',
      permalink: 'https://example.test/track',
      streamable: true,
      downloadAllowed: false,
      bpm: null,
      musicalKey: '',
    }

    const imported = await useLibraryStore.getState().addRemoteTrack(
      new File(['remote audio'], 'remote.mp3', { type: 'audio/mpeg' }),
      onlineTrack,
    )

    expect(imported).toMatchObject({
      title: 'Browser Track',
      artist: 'Web Artist',
      source: 'jamendo',
      sourceTrackId: 'jam-1',
      durationSeconds: 203,
    })
    useLibraryStore.getState().requestDeckLoad('A', imported.id)
    expect(useLibraryStore.getState().deckRequests.A?.track.id).toBe(imported.id)
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

  it('restores saved library rows as disconnected placeholders and reconnects them by fingerprint', async () => {
    const originalFile = new File(['same audio bytes'], 'Artist - Saved.mp3', { type: 'audio/mpeg', lastModified: 123 })
    await useLibraryStore.getState().addFiles([originalFile])
    const originalTrack = useLibraryStore.getState().tracks[0]
    const manifest = [serializeLibraryTrack(originalTrack)]

    useLibraryStore.setState({ tracks: [], manifestHydrated: false, deckRequests: { A: null, B: null } })
    useLibraryStore.getState().hydrateManifest(manifest)

    const restored = useLibraryStore.getState().tracks[0]
    expect(restored.id).toBe(originalTrack.id)
    expect(restored.file).toBeNull()
    expect(useLibraryStore.getState().manifestHydrated).toBe(true)

    useLibraryStore.getState().requestDeckLoad('A', restored.id)
    expect(useLibraryStore.getState().deckRequests.A).toBeNull()

    const rescannedFile = new File(['same audio bytes'], 'Artist - Saved.mp3', { type: 'audio/mpeg', lastModified: 456 })
    await useLibraryStore.getState().addFiles([rescannedFile])

    const reconnected = useLibraryStore.getState().tracks[0]
    expect(reconnected.id).toBe(originalTrack.id)
    expect(reconnected.file).toBe(rescannedFile)
    useLibraryStore.getState().requestDeckLoad('A', reconnected.id)
    expect(useLibraryStore.getState().deckRequests.A?.track.id).toBe(reconnected.id)
  })
})
