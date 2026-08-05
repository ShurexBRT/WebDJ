import type { DeckId, TrackHistoryItem } from '../state/mixerStore'

export type SessionSettings = {
  version: 1
  crossfader: number
  masterDeck: DeckId | null
  quantizeEnabled: boolean
  masterVolume: number
  cueVolume: number
  cueMix: number
  trackHistory: TrackHistoryItem[]
}

const STORAGE_KEY = 'webdj.session.v1'

const clamp = (value: unknown, min: number, max: number, fallback: number) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Math.min(max, Math.max(min, numeric)) : fallback
}

export function normalizeSessionSettings(value: Partial<SessionSettings>): SessionSettings {
  const trackHistory = Array.isArray(value.trackHistory)
    ? value.trackHistory
      .filter((item): item is TrackHistoryItem => Boolean(item && typeof item.id === 'string' && typeof item.name === 'string'))
      .map((item) => ({ id: item.id, name: item.name, lastLoadedAt: Number(item.lastLoadedAt) || 0 }))
      .slice(0, 50)
    : []

  return {
    version: 1,
    crossfader: clamp(value.crossfader, -1, 1, 0),
    masterDeck: value.masterDeck === 'A' || value.masterDeck === 'B' ? value.masterDeck : null,
    quantizeEnabled: value.quantizeEnabled !== false,
    masterVolume: clamp(value.masterVolume, 0, 1, 0.9),
    cueVolume: clamp(value.cueVolume, 0, 1, 0.8),
    cueMix: clamp(value.cueMix, 0, 1, 0),
    trackHistory,
  }
}

export function loadSessionSettings(storage: Storage = localStorage): SessionSettings | null {
  try {
    const serialized = storage.getItem(STORAGE_KEY)
    if (!serialized) return null
    return normalizeSessionSettings(JSON.parse(serialized) as Partial<SessionSettings>)
  } catch {
    return null
  }
}

export function saveSessionSettings(settings: SessionSettings, storage: Storage = localStorage): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(normalizeSessionSettings(settings)))
  } catch {
    // Storage can be unavailable in private browsing or a constrained iframe.
  }
}
