import { describe, expect, it } from 'vitest'
import { loadSessionSettings, normalizeSessionSettings, saveSessionSettings } from './sessionSettings'

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return Array.from(this.values.keys())[index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

describe('session settings', () => {
  it('normalizes unsafe and incomplete settings', () => {
    expect(normalizeSessionSettings({
      crossfader: 4,
      masterDeck: 'B',
      masterVolume: -1,
      cueVolume: 2,
      cueMix: Number.NaN,
      trackHistory: [{ id: 'one', name: 'Track One', lastLoadedAt: 20 }],
    })).toEqual({
      version: 1,
      crossfader: 1,
      masterDeck: 'B',
      quantizeEnabled: true,
      masterVolume: 0,
      cueVolume: 1,
      cueMix: Number.NaN,
      trackHistory: [{ id: 'one', name: 'Track One', lastLoadedAt: 20 }],
    })
  })

  it('round-trips settings through storage', () => {
    const storage = new MemoryStorage()
    const settings = normalizeSessionSettings({
      crossfader: -0.4,
      masterDeck: 'A',
      quantizeEnabled: false,
      masterVolume: 0.7,
      cueVolume: 0.4,
      cueMix: 0.65,
      trackHistory: [{ id: 'abc', name: 'Example.wav', lastLoadedAt: 123 }],
    })

    saveSessionSettings(settings, storage)
    expect(loadSessionSettings(storage)).toEqual(settings)
  })

  it('returns null for corrupt data', () => {
    const storage = new MemoryStorage()
    storage.setItem('webdj.session.v1', '{broken')
    expect(loadSessionSettings(storage)).toBeNull()
  })
})
