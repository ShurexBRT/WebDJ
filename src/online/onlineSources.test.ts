import { describe, expect, it } from 'vitest'
import { mapAudiusTracks } from './audius'
import { buildJamendoSearchUrl, mapJamendoTracks } from './jamendo'
import { extensionForAudioType, responseToTrackFile, safeFileName, type OnlineTrack } from './types'

const track: OnlineTrack = {
  source: 'jamendo',
  id: '10',
  title: 'A/B Test?',
  artist: 'Artist: One',
  album: '',
  genre: 'Electronic',
  durationSeconds: 180,
  artworkUrl: '',
  permalink: '',
  streamable: true,
  downloadAllowed: false,
  bpm: null,
  musicalKey: '',
}

describe('online music adapters', () => {
  it('builds a constrained Jamendo search URL without leaking other credentials', () => {
    const url = new URL(buildJamendoSearchUrl('deep house', 'client-123', 500))
    expect(url.origin).toBe('https://api.jamendo.com')
    expect(url.searchParams.get('client_id')).toBe('client-123')
    expect(url.searchParams.get('search')).toBe('deep house')
    expect(url.searchParams.get('limit')).toBe('50')
    expect(url.searchParams.get('audioformat')).toBe('mp32')
  })

  it('maps Jamendo and Audius records into the shared source contract', () => {
    expect(mapJamendoTracks([{
      id: '10',
      name: 'Jam Track',
      artist_name: 'Jam Artist',
      duration: '181',
      audio: 'https://audio.example/jam.mp3',
      audiodownload_allowed: false,
      musicinfo: { tags: { genres: ['House'] } },
    }])).toEqual([expect.objectContaining({
      source: 'jamendo',
      id: '10',
      title: 'Jam Track',
      artist: 'Jam Artist',
      genre: 'House',
      streamable: true,
      downloadAllowed: false,
    })])

    expect(mapAudiusTracks([{
      id: 'abc',
      title: 'Open Track',
      duration: 205,
      genre: 'Techno',
      bpm: 128,
      musicalKey: 'Am',
      isStreamable: true,
      user: { name: 'Open Artist' },
    }])).toEqual([expect.objectContaining({
      source: 'audius',
      id: 'abc',
      title: 'Open Track',
      artist: 'Open Artist',
      bpm: 128,
      musicalKey: 'Am',
    })])
  })

  it('converts source responses to safe in-memory audio files', async () => {
    const response = new Response('audio', {
      status: 200,
      headers: { 'content-type': 'audio/ogg' },
    })
    const loaded = await responseToTrackFile(response, track)
    expect(loaded.file.name).toBe('Artist One - AB Test.ogg')
    expect(loaded.file.type).toBe('audio/ogg')
    expect(extensionForAudioType('audio/flac')).toBe('flac')
    expect(safeFileName('  žurka / test?  ')).toBe('zurka test')
  })

  it('rejects successful JSON error pages instead of disguising them as MP3 files', async () => {
    const response = new Response(JSON.stringify({ error: 'stream unavailable' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
    await expect(responseToTrackFile(response, track)).rejects.toThrow('instead of audio')
  })
})
