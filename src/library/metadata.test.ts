import { describe, expect, it } from 'vitest'
import { metadataFromFileName, parseId3v1, readTrackMetadata } from './metadata'

describe('track metadata', () => {
  it('derives artist and title from a conventional filename', () => {
    expect(metadataFromFileName('Daft Punk - One More Time.mp3')).toEqual({
      artist: 'Daft Punk',
      title: 'One More Time',
      album: '',
      genre: '',
    })
    expect(metadataFromFileName('untitled_mix.wav').title).toBe('untitled mix')
  })

  it('parses ID3v1 title artist album and genre', () => {
    const tag = new Uint8Array(128)
    tag.set(new TextEncoder().encode('TAG'), 0)
    tag.set(new TextEncoder().encode('Track Title'), 3)
    tag.set(new TextEncoder().encode('Artist Name'), 33)
    tag.set(new TextEncoder().encode('Album Name'), 63)
    tag[127] = 17

    expect(parseId3v1(tag)).toEqual({
      title: 'Track Title',
      artist: 'Artist Name',
      album: 'Album Name',
      genre: '17',
    })
  })

  it('falls back to the filename when tags are unavailable', async () => {
    const metadata = await readTrackMetadata(new File(['plain audio'], 'Artist - Song.wav', { type: 'audio/wav' }))
    expect(metadata).toMatchObject({ artist: 'Artist', title: 'Song' })
  })
})
