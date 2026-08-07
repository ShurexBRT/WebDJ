import { useEffect } from 'react'
import { useLibraryStore } from '../state/libraryStore'
import { syncCachedLibraryProfiles } from './libraryAnalysisWorker'

export function LibraryAnalysisController() {
  const tracks = useLibraryStore((state) => state.tracks)

  useEffect(() => {
    let cancelled = false
    void syncCachedLibraryProfiles(tracks, () => cancelled)
    return () => { cancelled = true }
  }, [tracks])

  return null
}
