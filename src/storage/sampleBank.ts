import type { SamplerMode } from '../audio/sampler'

export type StoredSampleSlot = {
  slot: number
  name: string
  mimeType: string
  blob: Blob
  mode: SamplerMode
  volume: number
  updatedAt: number
}

const DATABASE_NAME = 'webdj-sampler'
const DATABASE_VERSION = 1
const SAMPLE_STORE = 'samples'
const memorySamples = new Map<number, StoredSampleSlot>()

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(SAMPLE_STORE)) {
        request.result.createObjectStore(SAMPLE_STORE, { keyPath: 'slot' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Unable to open sampler bank'))
  })
}

export async function saveSampleSlot(sample: StoredSampleSlot): Promise<void> {
  const normalized = { ...sample, updatedAt: Date.now() }
  const database = await openDatabase()
  if (!database) {
    memorySamples.set(sample.slot, normalized)
    return
  }
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(SAMPLE_STORE, 'readwrite')
    transaction.objectStore(SAMPLE_STORE).put(normalized)
    transaction.oncomplete = () => { database.close(); resolve() }
    transaction.onerror = () => reject(transaction.error ?? new Error('Unable to save sample slot'))
  })
}

export async function loadSampleBank(): Promise<StoredSampleSlot[]> {
  const database = await openDatabase()
  if (!database) return Array.from(memorySamples.values())
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(SAMPLE_STORE, 'readonly')
    const request = transaction.objectStore(SAMPLE_STORE).getAll()
    request.onsuccess = () => resolve((request.result as StoredSampleSlot[]).sort((a, b) => a.slot - b.slot))
    request.onerror = () => reject(request.error ?? new Error('Unable to load sampler bank'))
    transaction.oncomplete = () => database.close()
  })
}

export async function deleteSampleSlot(slot: number): Promise<void> {
  memorySamples.delete(slot)
  const database = await openDatabase()
  if (!database) return
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(SAMPLE_STORE, 'readwrite')
    transaction.objectStore(SAMPLE_STORE).delete(slot)
    transaction.oncomplete = () => { database.close(); resolve() }
    transaction.onerror = () => reject(transaction.error ?? new Error('Unable to delete sample slot'))
  })
}

export async function clearSampleBank(): Promise<void> {
  memorySamples.clear()
  const database = await openDatabase()
  if (!database) return
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(SAMPLE_STORE, 'readwrite')
    transaction.objectStore(SAMPLE_STORE).clear()
    transaction.oncomplete = () => { database.close(); resolve() }
    transaction.onerror = () => reject(transaction.error ?? new Error('Unable to clear sample bank'))
  })
}
