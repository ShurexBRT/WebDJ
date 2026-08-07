import type { LibraryTrack } from '../state/libraryStore'

export type PersistedLibraryTrack = Omit<LibraryTrack, 'file'>

const DATABASE_NAME = 'webdj-library-state'
const DATABASE_VERSION = 1
const STORE_NAME = 'state'
const MANIFEST_KEY = 'library-manifest-v1'

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Unable to open WebDJ library state database'))
  })
}

export function serializeLibraryTrack(track: LibraryTrack): PersistedLibraryTrack {
  return {
    id: track.id,
    fileName: track.fileName,
    size: track.size,
    type: track.type,
    addedAt: track.addedAt,
    source: track.source,
    sourceTrackId: track.sourceTrackId,
    artworkUrl: track.artworkUrl,
    permalink: track.permalink,
    durationSeconds: track.durationSeconds,
    title: track.title,
    artist: track.artist,
    album: track.album,
    genre: track.genre,
  }
}

export function hydrateLibraryTrack(track: PersistedLibraryTrack): LibraryTrack {
  return { ...track, file: null }
}

export async function loadLibraryManifest(): Promise<PersistedLibraryTrack[]> {
  const database = await openDatabase()
  if (!database) return []
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).get(MANIFEST_KEY)
    request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result as PersistedLibraryTrack[] : [])
    request.onerror = () => reject(request.error ?? new Error('Unable to read saved WebDJ library'))
    transaction.oncomplete = () => database.close()
  })
}

export async function saveLibraryManifest(tracks: LibraryTrack[]): Promise<void> {
  const database = await openDatabase()
  if (!database) return
  const manifest = tracks.map(serializeLibraryTrack)
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(manifest, MANIFEST_KEY)
    transaction.oncomplete = () => {
      database.close()
      resolve()
    }
    transaction.onerror = () => reject(transaction.error ?? new Error('Unable to save WebDJ library'))
    transaction.onabort = () => reject(transaction.error ?? new Error('WebDJ library save aborted'))
  })
}
