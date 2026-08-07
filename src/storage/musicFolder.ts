export type MusicFolderPermission = 'granted' | 'denied' | 'prompt'

type PermissionCapableDirectoryHandle = FileSystemDirectoryHandle & {
  queryPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<MusicFolderPermission>
  requestPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<MusicFolderPermission>
}

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>
}

type ReadableFileHandle = {
  kind: 'file'
  getFile: () => Promise<File>
}

type ReadableDirectoryHandle = {
  kind: 'directory'
  name: string
  values: () => AsyncIterableIterator<ReadableEntry>
}

type ReadableEntry = ReadableFileHandle | ReadableDirectoryHandle

const DATABASE_NAME = 'webdj-library-access'
const DATABASE_VERSION = 1
const HANDLE_STORE = 'handles'
const MUSIC_FOLDER_KEY = 'music-folder'
const AUDIO_EXTENSION = /\.(mp3|wav|flac|m4a|aac|ogg|opus|webm)$/i

let memoryHandle: FileSystemDirectoryHandle | null = null

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(HANDLE_STORE)) {
        request.result.createObjectStore(HANDLE_STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Unable to open WebDJ folder database'))
  })
}

export function supportsMusicFolderAccess(): boolean {
  return typeof window !== 'undefined' && typeof (window as DirectoryPickerWindow).showDirectoryPicker === 'function'
}

export async function pickMusicFolder(): Promise<FileSystemDirectoryHandle> {
  const picker = (window as DirectoryPickerWindow).showDirectoryPicker
  if (!picker) throw new Error('Folder access is not supported in this browser')
  return picker.call(window, { mode: 'read' })
}

export async function getMusicFolderPermission(handle: FileSystemDirectoryHandle): Promise<MusicFolderPermission> {
  const permissionHandle = handle as PermissionCapableDirectoryHandle
  if (!permissionHandle.queryPermission) return 'prompt'
  return permissionHandle.queryPermission({ mode: 'read' })
}

export async function requestMusicFolderPermission(handle: FileSystemDirectoryHandle): Promise<MusicFolderPermission> {
  const permissionHandle = handle as PermissionCapableDirectoryHandle
  if (!permissionHandle.requestPermission) return 'prompt'
  return permissionHandle.requestPermission({ mode: 'read' })
}

export async function saveMusicFolderHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  memoryHandle = handle
  const database = await openDatabase()
  if (!database) return
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(HANDLE_STORE, 'readwrite')
    transaction.objectStore(HANDLE_STORE).put(handle, MUSIC_FOLDER_KEY)
    transaction.oncomplete = () => {
      database.close()
      resolve()
    }
    transaction.onerror = () => reject(transaction.error ?? new Error('Unable to save music folder access'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Music folder save aborted'))
  })
}

export async function getSavedMusicFolderHandle(): Promise<FileSystemDirectoryHandle | null> {
  const database = await openDatabase()
  if (!database) return memoryHandle
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(HANDLE_STORE, 'readonly')
    const request = transaction.objectStore(HANDLE_STORE).get(MUSIC_FOLDER_KEY)
    request.onsuccess = () => resolve((request.result as FileSystemDirectoryHandle | undefined) ?? memoryHandle)
    request.onerror = () => reject(request.error ?? new Error('Unable to read saved music folder'))
    transaction.oncomplete = () => database.close()
  })
}

export async function clearSavedMusicFolderHandle(): Promise<void> {
  memoryHandle = null
  const database = await openDatabase()
  if (!database) return
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(HANDLE_STORE, 'readwrite')
    transaction.objectStore(HANDLE_STORE).delete(MUSIC_FOLDER_KEY)
    transaction.oncomplete = () => {
      database.close()
      resolve()
    }
    transaction.onerror = () => reject(transaction.error ?? new Error('Unable to forget music folder'))
  })
}

export function isSupportedAudioFile(file: File): boolean {
  return file.type.startsWith('audio/') || AUDIO_EXTENSION.test(file.name)
}

export async function collectAudioFiles(
  handle: ReadableDirectoryHandle,
  maxDepth = 8,
  currentDepth = 0,
): Promise<File[]> {
  const files: File[] = []
  for await (const entry of handle.values()) {
    if (entry.kind === 'file') {
      const file = await entry.getFile()
      if (isSupportedAudioFile(file)) files.push(file)
      continue
    }
    if (currentDepth < maxDepth) {
      files.push(...await collectAudioFiles(entry, maxDepth, currentDepth + 1))
    }
  }
  return files
}

export async function readMusicFolderFiles(handle: FileSystemDirectoryHandle): Promise<File[]> {
  return collectAudioFiles(handle as unknown as ReadableDirectoryHandle)
}
