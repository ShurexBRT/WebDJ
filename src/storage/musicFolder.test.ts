import { describe, expect, it } from 'vitest'
import { collectAudioFiles, isSupportedAudioFile } from './musicFolder'

type TestEntry =
  | { kind: 'file'; getFile: () => Promise<File> }
  | { kind: 'directory'; name: string; values: () => AsyncIterableIterator<TestEntry> }

const fileEntry = (name: string, type = ''): TestEntry => ({
  kind: 'file',
  getFile: async () => new File(['audio'], name, { type }),
})

const directoryEntry = (name: string, entries: TestEntry[]): TestEntry => ({
  kind: 'directory',
  name,
  async *values() {
    for (const entry of entries) yield entry
  },
})

describe('music folder scanning', () => {
  it('recognises supported audio by MIME type or extension', () => {
    expect(isSupportedAudioFile(new File(['x'], 'track.bin', { type: 'audio/mpeg' }))).toBe(true)
    expect(isSupportedAudioFile(new File(['x'], 'track.FLAC'))).toBe(true)
    expect(isSupportedAudioFile(new File(['x'], 'cover.jpg', { type: 'image/jpeg' }))).toBe(false)
  })

  it('collects audio recursively and ignores unrelated files', async () => {
    const root = directoryEntry('Music', [
      fileEntry('one.mp3', 'audio/mpeg'),
      fileEntry('cover.jpg', 'image/jpeg'),
      directoryEntry('House', [
        fileEntry('two.wav', 'audio/wav'),
        directoryEntry('Deep', [fileEntry('three.flac')]),
      ]),
    ])

    const files = await collectAudioFiles(root as Parameters<typeof collectAudioFiles>[0])
    expect(files.map((file) => file.name)).toEqual(['one.mp3', 'two.wav', 'three.flac'])
  })
})
