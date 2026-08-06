import { useEffect } from 'react'
import { useKeyStore } from '../state/keyStore'
import { useMixerStore, type DeckId } from '../state/mixerStore'
import { saveTrackProfile, type PersistedBpmStatus, type PersistedKeyStatus } from './trackProfiles'

export function useTrackProfilePersistence(deckId: DeckId): void {
  const deck = useMixerStore((state) => state.decks[deckId])
  const deckKey = useKeyStore((state) => state.decks[deckId])

  useEffect(() => {
    if (!deck.trackId || !deck.trackName || deck.isAnalyzing) return

    const timeout = window.setTimeout(() => {
      const bpmAnalysisStatus: PersistedBpmStatus = deck.bpmAnalysisStatus === 'analyzing'
        ? 'idle'
        : deck.bpmAnalysisStatus
      const keyAnalysisStatus: PersistedKeyStatus = deckKey.status === 'analyzing'
        ? 'idle'
        : deckKey.status

      void saveTrackProfile({
        id: deck.trackId!,
        fileName: deck.trackName!,
        fileSize: deck.fileSize,
        lastModified: deck.lastModified,
        bpm: deck.bpm,
        bpmConfidence: deck.bpmConfidence,
        bpmAnalysisStatus,
        key: deckKey.key,
        camelotKey: deckKey.camelotKey,
        keyConfidence: deckKey.confidence,
        keyAnalysisStatus,
        beatOffsetSeconds: deck.beatOffsetSeconds,
        barOffsetBeats: deck.barOffsetBeats,
        waveform: deck.waveform,
        cuePoint: deck.cuePoint,
        hotCues: deck.hotCues,
        loopBeats: deck.loopBeats,
        updatedAt: Date.now(),
      })
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [
    deck.barOffsetBeats,
    deck.beatOffsetSeconds,
    deck.bpm,
    deck.bpmAnalysisStatus,
    deck.bpmConfidence,
    deck.cuePoint,
    deck.fileSize,
    deck.hotCues,
    deck.isAnalyzing,
    deck.lastModified,
    deck.loopBeats,
    deck.trackId,
    deck.trackName,
    deck.waveform,
    deckKey.camelotKey,
    deckKey.confidence,
    deckKey.key,
    deckKey.status,
  ])
}
