import { getAudioEngine } from '../audio/AudioEngine'
import { analyzeDecodedTrack, decodeTrackFile } from '../audio/trackAnalysis'
import { useAutoTransitionStore } from '../state/autoTransitionStore'
import { useLibraryAnalysisStore } from '../state/libraryAnalysisStore'
import { useLibraryStore, type LibraryTrack } from '../state/libraryStore'
import { getTrackProfile, saveTrackProfile } from '../storage/trackProfiles'
import { isTrackProfileAnalysisComplete, mergeLibraryAnalysisProfile } from './libraryAnalysis'

let workerRunning = false

const delay = (milliseconds: number) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds))

function trackStillExists(trackId: string): boolean {
  return useLibraryStore.getState().tracks.some((track) => track.id === trackId)
}

function transitionNeedsMainThread(): boolean {
  const status = useAutoTransitionStore.getState().status
  return status === 'preparing' || status === 'ready' || status === 'running'
}

async function waitForSafeAnalysisWindow(): Promise<void> {
  while (transitionNeedsMainThread()) await delay(100)
}

export async function runLibraryAnalysisWorker(): Promise<void> {
  if (workerRunning) return
  workerRunning = true

  try {
    while (true) {
      const library = useLibraryStore.getState()
      const queue = useLibraryAnalysisStore.getState()
      const nextTrack = library.tracks.find((track) => queue.items[track.id]?.status === 'queued')
      if (!nextTrack) return

      queue.start(nextTrack.id, nextTrack.title || nextTrack.fileName)

      try {
        const cached = await getTrackProfile(nextTrack.id)
        if (isTrackProfileAnalysisComplete(cached)) {
          if (trackStillExists(nextTrack.id)) useLibraryAnalysisStore.getState().succeed(nextTrack.id)
          await delay(16)
          continue
        }

        // Only begin decoding while no transition is preparing, armed for start, or running.
        await waitForSafeAnalysisWindow()
        if (!trackStillExists(nextTrack.id)) {
          useLibraryAnalysisStore.getState().removeMissing(useLibraryStore.getState().tracks.map((track) => track.id))
          continue
        }

        const decoded = await decodeTrackFile(nextTrack.file, getAudioEngine().context)

        // decodeAudioData is asynchronous. A transition may have started while decoding,
        // so re-check immediately before the synchronous BPM/key/gain/waveform DSP pass.
        await waitForSafeAnalysisWindow()
        if (!trackStillExists(nextTrack.id)) {
          useLibraryAnalysisStore.getState().removeMissing(useLibraryStore.getState().tracks.map((track) => track.id))
          continue
        }

        const analysis = analyzeDecodedTrack(decoded)
        const latestProfile = await getTrackProfile(nextTrack.id)
        const profile = mergeLibraryAnalysisProfile(nextTrack, analysis, latestProfile)
        await saveTrackProfile(profile)

        if (trackStillExists(nextTrack.id)) useLibraryAnalysisStore.getState().succeed(nextTrack.id)
      } catch (error) {
        if (trackStillExists(nextTrack.id)) {
          useLibraryAnalysisStore.getState().fail(
            nextTrack.id,
            error instanceof Error ? error.message : 'Track analysis failed',
          )
        }
      }

      await delay(24)
    }
  } finally {
    workerRunning = false
    const hasQueuedTracks = useLibraryStore.getState().tracks.some(
      (track) => useLibraryAnalysisStore.getState().items[track.id]?.status === 'queued',
    )
    if (hasQueuedTracks) void runLibraryAnalysisWorker()
  }
}

export async function syncCachedLibraryProfiles(
  tracks: LibraryTrack[],
  isCancelled: () => boolean,
): Promise<void> {
  const ids = tracks.map((track) => track.id)
  const queue = useLibraryAnalysisStore.getState()
  queue.removeMissing(ids)
  queue.enqueue(ids)

  await Promise.all(tracks.map(async (track) => {
    const current = useLibraryAnalysisStore.getState().items[track.id]
    if (current?.status === 'analyzing') return
    try {
      const profile = await getTrackProfile(track.id)
      if (isCancelled() || !trackStillExists(track.id)) return
      if (isTrackProfileAnalysisComplete(profile)) useLibraryAnalysisStore.getState().succeed(track.id)
    } catch {
      // A cache read failure should not block a fresh analysis attempt.
    }
  }))

  if (!isCancelled()) void runLibraryAnalysisWorker()
}
