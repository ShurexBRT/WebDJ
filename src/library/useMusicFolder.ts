import { useCallback, useEffect, useRef, useState } from 'react'
import {
  clearSavedMusicFolderHandle,
  getMusicFolderPermission,
  getSavedMusicFolderHandle,
  pickMusicFolder,
  readMusicFolderFiles,
  requestMusicFolderPermission,
  saveMusicFolderHandle,
  supportsMusicFolderAccess,
} from '../storage/musicFolder'
import { useLibraryStore } from '../state/libraryStore'

export type MusicFolderStatus =
  | 'unsupported'
  | 'idle'
  | 'restoring'
  | 'linking'
  | 'ready'
  | 'permission-required'
  | 'error'

type MusicFolderState = {
  status: MusicFolderStatus
  folderName: string
  trackCount: number
  message: string
}

const initialState = (): MusicFolderState => ({
  status: supportsMusicFolderAccess() ? 'idle' : 'unsupported',
  folderName: '',
  trackCount: 0,
  message: supportsMusicFolderAccess() ? '' : 'Folder linking requires a Chromium-based browser',
})

export function useMusicFolder() {
  const addFiles = useLibraryStore((state) => state.addFiles)
  const [state, setState] = useState<MusicFolderState>(initialState)
  const restoredRef = useRef(false)

  const importFromHandle = useCallback(async (handle: FileSystemDirectoryHandle, status: 'restoring' | 'linking') => {
    setState({ status, folderName: handle.name, trackCount: 0, message: status === 'restoring' ? 'Restoring linked folder…' : 'Scanning music folder…' })
    const files = await readMusicFolderFiles(handle)
    await addFiles(files)
    setState({
      status: 'ready',
      folderName: handle.name,
      trackCount: files.length,
      message: files.length === 1 ? '1 audio file linked' : `${files.length} audio files linked`,
    })
  }, [addFiles])

  const restore = useCallback(async () => {
    if (!supportsMusicFolderAccess()) return
    try {
      const handle = await getSavedMusicFolderHandle()
      if (!handle) {
        setState((current) => ({ ...current, status: 'idle' }))
        return
      }
      const permission = await getMusicFolderPermission(handle)
      if (permission !== 'granted') {
        setState({
          status: 'permission-required',
          folderName: handle.name,
          trackCount: 0,
          message: 'Reconnect once to restore this folder',
        })
        return
      }
      await importFromHandle(handle, 'restoring')
    } catch (error) {
      setState({
        status: 'error',
        folderName: '',
        trackCount: 0,
        message: error instanceof Error ? error.message : 'Unable to restore music folder',
      })
    }
  }, [importFromHandle])

  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    void restore()
  }, [restore])

  const linkFolder = useCallback(async () => {
    try {
      const handle = await pickMusicFolder()
      await saveMusicFolderHandle(handle)
      await importFromHandle(handle, 'linking')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setState((current) => ({
        ...current,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unable to link music folder',
      }))
    }
  }, [importFromHandle])

  const reconnectFolder = useCallback(async () => {
    try {
      const handle = await getSavedMusicFolderHandle()
      if (!handle) {
        setState((current) => ({ ...current, status: 'idle', folderName: '', message: '' }))
        return
      }
      const permission = await requestMusicFolderPermission(handle)
      if (permission !== 'granted') {
        setState({ status: 'permission-required', folderName: handle.name, trackCount: 0, message: 'Folder permission was not granted' })
        return
      }
      await importFromHandle(handle, 'restoring')
    } catch (error) {
      setState((current) => ({
        ...current,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unable to reconnect music folder',
      }))
    }
  }, [importFromHandle])

  const refreshFolder = useCallback(async () => {
    try {
      const handle = await getSavedMusicFolderHandle()
      if (!handle) {
        setState((current) => ({ ...current, status: 'idle', folderName: '', message: '' }))
        return
      }
      const permission = await getMusicFolderPermission(handle)
      if (permission !== 'granted') {
        setState({ status: 'permission-required', folderName: handle.name, trackCount: 0, message: 'Reconnect to refresh this folder' })
        return
      }
      await importFromHandle(handle, 'restoring')
    } catch (error) {
      setState((current) => ({
        ...current,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unable to refresh music folder',
      }))
    }
  }, [importFromHandle])

  const forgetFolder = useCallback(async () => {
    await clearSavedMusicFolderHandle()
    setState({ status: 'idle', folderName: '', trackCount: 0, message: '' })
  }, [])

  return {
    ...state,
    linkFolder,
    reconnectFolder,
    refreshFolder,
    forgetFolder,
  }
}
