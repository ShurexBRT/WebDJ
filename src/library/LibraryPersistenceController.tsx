import { useEffect, useRef } from 'react'
import { loadLibraryManifest, saveLibraryManifest } from '../storage/libraryManifest'
import { useLibraryStore } from '../state/libraryStore'

export function LibraryPersistenceController() {
  const tracks = useLibraryStore((state) => state.tracks)
  const manifestHydrated = useLibraryStore((state) => state.manifestHydrated)
  const hydrateManifest = useLibraryStore((state) => state.hydrateManifest)
  const loadingRef = useRef(false)

  useEffect(() => {
    if (manifestHydrated || loadingRef.current) return
    loadingRef.current = true
    void loadLibraryManifest()
      .then((manifest) => hydrateManifest(manifest))
      .catch(() => hydrateManifest([]))
  }, [hydrateManifest, manifestHydrated])

  useEffect(() => {
    if (!manifestHydrated) return
    const timeout = window.setTimeout(() => {
      void saveLibraryManifest(tracks)
    }, 150)
    return () => window.clearTimeout(timeout)
  }, [manifestHydrated, tracks])

  return null
}
