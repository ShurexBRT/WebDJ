export type PersistedBpmStatus = 'detected' | 'manual' | 'failed' | 'idle'
export type PersistedKeyStatus = 'detected' | 'manual' | 'failed' | 'idle'

export type TrackProfile = {
  id: string
  fileName: string
  fileSize: number
  lastModified: number
  bpm: number
  bpmConfidence: number
  bpmAnalysisStatus: PersistedBpmStatus
  key: string
  camelotKey: string
  keyConfidence: number
  keyAnalysisStatus: PersistedKeyStatus
  beatOffsetSeconds: number
  barOffsetBeats: number
  waveform: number[]
  cuePoint: number | null
  hotCues: Array<number | null>
  loopBeats: 1 | 2 | 4 | 8 | 16
  updatedAt: number
}

type LegacyTrackProfile = Omit<TrackProfile, 'key' | 'camelotKey' | 'keyConfidence' | 'keyAnalysisStatus'> & Partial<Pick<TrackProfile, 'key' | 'camelotKey' | 'keyConfidence' | 'keyAnalysisStatus'>>

const DATABASE_NAME = 'webdj-studio'
const DATABASE_VERSION = 1
const PROFILE_STORE = 'trackProfiles'
const memoryProfiles = new Map<string, TrackProfile>()

const normalizeProfile = (profile: LegacyTrackProfile): TrackProfile => ({
  ...profile,
  key: profile.key ?? '',
  camelotKey: profile.camelotKey ?? '',
  keyConfidence: profile.keyConfidence ?? 0,
  keyAnalysisStatus: profile.keyAnalysisStatus ?? 'idle',
  waveform: profile.waveform.slice(0, 1_200),
  hotCues: profile.hotCues.slice(0, 6),
})

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(PROFILE_STORE)) {
        request.result.createObjectStore(PROFILE_STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Unable to open WebDJ track database'))
  })
}

export async function fingerprintFile(file: File): Promise<string> {
  const chunkSize = 64 * 1024
  const starts = [0, Math.max(0, Math.floor(file.size / 2 - chunkSize / 2)), Math.max(0, file.size - chunkSize)]
  const chunks = await Promise.all(starts.map((start) => file.slice(start, start + chunkSize).arrayBuffer()))
  const metadata = new TextEncoder().encode(`${file.name}|${file.size}|${file.type}`)
  const totalSize = metadata.byteLength + chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
  const bytes = new Uint8Array(totalSize)
  let offset = 0
  bytes.set(metadata, offset)
  offset += metadata.byteLength
  chunks.forEach((chunk) => {
    bytes.set(new Uint8Array(chunk), offset)
    offset += chunk.byteLength
  })

  if (!globalThis.crypto?.subtle) {
    let hash = 2166136261
    for (const byte of bytes) hash = Math.imul(hash ^ byte, 16777619)
    return `fallback-${(hash >>> 0).toString(16).padStart(8, '0')}`
  }

  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function getTrackProfile(id: string): Promise<TrackProfile | null> {
  const database = await openDatabase()
  if (!database) return memoryProfiles.get(id) ?? null
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PROFILE_STORE, 'readonly')
    const request = transaction.objectStore(PROFILE_STORE).get(id)
    request.onsuccess = () => resolve(request.result ? normalizeProfile(request.result as LegacyTrackProfile) : null)
    request.onerror = () => reject(request.error ?? new Error('Unable to read WebDJ track profile'))
    transaction.oncomplete = () => database.close()
  })
}

export async function saveTrackProfile(profile: TrackProfile): Promise<void> {
  const normalized = normalizeProfile({ ...profile, updatedAt: Date.now() })
  const database = await openDatabase()
  if (!database) {
    memoryProfiles.set(profile.id, normalized)
    return
  }
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(PROFILE_STORE, 'readwrite')
    transaction.objectStore(PROFILE_STORE).put(normalized)
    transaction.oncomplete = () => {
      database.close()
      resolve()
    }
    transaction.onerror = () => reject(transaction.error ?? new Error('Unable to save WebDJ track profile'))
    transaction.onabort = () => reject(transaction.error ?? new Error('WebDJ track profile save aborted'))
  })
}

export async function clearTrackProfiles(): Promise<void> {
  memoryProfiles.clear()
  const database = await openDatabase()
  if (!database) return
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(PROFILE_STORE, 'readwrite')
    transaction.objectStore(PROFILE_STORE).clear()
    transaction.oncomplete = () => {
      database.close()
      resolve()
    }
    transaction.onerror = () => reject(transaction.error ?? new Error('Unable to clear WebDJ track profiles'))
  })
}
