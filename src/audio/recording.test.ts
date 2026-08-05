import { describe, expect, it } from 'vitest'
import { createMixFileName, selectRecorderMimeType } from './recording'

describe('mix recording helpers', () => {
  it('selects the first supported audio format', () => {
    expect(selectRecorderMimeType((mimeType) => mimeType === 'audio/ogg;codecs=opus')).toBe('audio/ogg;codecs=opus')
    expect(selectRecorderMimeType(() => false)).toBe('')
  })

  it('creates filesystem-safe timestamped names', () => {
    expect(createMixFileName('webm', new Date('2026-08-05T22:30:15.120Z'))).toBe('webdj-mix_2026-08-05_22-30-15-120.webm')
    expect(createMixFileName('ogg', new Date('2026-08-05T22:30:15.120Z'))).toMatch(/\.ogg$/)
  })
})
