import { Bot, FolderOpen, History, Search, Sparkles, Trash2, Upload } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { effectiveBpm } from '../audio/tempo'
import { getAudioEngine } from '../audio/AudioEngine'
import { AudioSettings } from '../features/settings/AudioSettings'
import { getTrackProfile, type TrackProfile } from '../storage/trackProfiles'
import { useKeyStore } from '../state/keyStore'
import { useLibraryStore } from '../state/libraryStore'
import { useMixerStore, type DeckId } from '../state/mixerStore'
import { AiAssistantPanel } from './AiAssistantPanel'
import { ControllerSettings } from './ControllerSettings'
import { KnobControl } from './KnobControl'
import { OnlineSourceBrowser } from './OnlineSourceBrowser'
import './library.css'

const deckIds: DeckId[] = ['A', 'B']

const formatBytes = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function StudioDock() {
  const decks = useMixerStore((state) => state.decks)
  const deckKeys = useKeyStore((state) => state.decks)
  const trackHistory = useMixerStore((state) => state.trackHistory)
  const cueVolume = useMixerStore((state) => state.cueVolume)
  const cueMix = useMixerStore((state) => state.cueMix)
  const masterVolume = useMixerStore((state) => state.masterVolume)
  const setCueVolume = useMixerStore((state) => state.setCueVolume)
  const setCueMix = useMixerStore((state) => state.setCueMix)
  const setMasterVolume = useMixerStore((state) => state.setMasterVolume)
  const libraryTracks = useLibraryStore((state) => state.tracks)
  const isImporting = useLibraryStore((state) => state.isImporting)
  const addFiles = useLibraryStore((state) => state.addFiles)
  const removeTrack = useLibraryStore((state) => state.removeTrack)
  const clearLibrary = useLibraryStore((state) => state.clearLibrary)
  const requestDeckLoad = useLibraryStore((state) => state.requestDeckLoad)
  const [query, setQuery] = useState('')
  const [browseSection, setBrowseSection] = useState('Local Files')
  const [isDragging, setIsDragging] = useState(false)
  const [clearArmed, setClearArmed] = useState(false)
  const [trackProfiles, setTrackProfiles] = useState<Map<string, TrackProfile>>(new Map())
  const engine = getAudioEngine()

  const deckByTrackId = useMemo(() => new Map(
    deckIds
      .filter((deckId) => decks[deckId].trackId)
      .map((deckId) => [decks[deckId].trackId!, { deckId, deck: decks[deckId], key: deckKeys[deckId] }]),
  ), [deckKeys, decks])

  const filteredTracks = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return libraryTracks
    return libraryTracks.filter((track) => [track.title, track.artist, track.album, track.genre, track.fileName]
      .some((value) => value.toLowerCase().includes(needle)))
  }, [libraryTracks, query])

  useEffect(() => {
    let cancelled = false
    void Promise.all(libraryTracks.map(async (track) => [track.id, await getTrackProfile(track.id)] as const))
      .then((entries) => {
        if (cancelled) return
        setTrackProfiles(new Map(entries.flatMap(([id, profile]) => profile ? [[id, profile] as const] : [])))
      })
    return () => { cancelled = true }
  }, [
    libraryTracks,
    decks.A.trackId,
    decks.A.bpm,
    decks.B.trackId,
    decks.B.bpm,
    deckKeys.A.camelotKey,
    deckKeys.B.camelotKey,
  ])

  useEffect(() => {
    if (!clearArmed) return
    const timeout = window.setTimeout(() => setClearArmed(false), 3_500)
    return () => window.clearTimeout(timeout)
  }, [clearArmed])

  const handleClearLibrary = () => {
    if (!clearArmed) {
      setClearArmed(true)
      return
    }
    clearLibrary()
    setQuery('')
    setClearArmed(false)
  }

  const visibleTrackCount = query.trim() && filteredTracks.length !== libraryTracks.length
    ? `${filteredTracks.length} / ${libraryTracks.length}`
    : String(libraryTracks.length)

  return (
    <section className="studio-dock" id="library-dock" aria-label="Studio library and routing">
      <section className="library-panel">
        <div className="dock-tabs library-toolbar" aria-label="Library navigation">
          <button className="active" type="button">LIBRARY</button>
          <label className="library-import-button"><Upload size={12} /> {isImporting ? 'IMPORTING…' : 'ADD TRACKS'}<input aria-label="Add tracks to library" type="file" accept="audio/*" multiple onChange={(event) => { void addFiles(event.target.files ?? []); event.currentTarget.value = '' }} /></label>
          <span className="library-track-count">{visibleTrackCount} TRACKS</span>
          <button
            className={`library-clear-button${clearArmed ? ' confirm' : ''}`}
            type="button"
            aria-label={clearArmed ? 'Confirm clear library' : 'Clear library'}
            disabled={libraryTracks.length === 0}
            onClick={handleClearLibrary}
          >
            {clearArmed ? 'CONFIRM CLEAR' : 'CLEAR'}
          </button>
        </div>
        <div className="library-body">
          <aside className="library-sidebar">
            <strong>BROWSE</strong>
            {[
              ['AI Assistant', <Bot size={13} />],
              ['Local Files', <FolderOpen size={13} />],
              ['History', <History size={13} />],
              ['Audius', <Sparkles size={13} />],
              ['Jamendo', <Sparkles size={13} />],
            ].map(([label, icon]) => <button key={String(label)} className={browseSection === label ? 'active' : ''} type="button" onClick={() => setBrowseSection(String(label))}>{icon}{label}</button>)}
          </aside>
          <div
            className={`library-content${isDragging ? ' dragging' : ''}`}
            onDragEnter={(event) => { event.preventDefault(); setIsDragging(true) }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => { if (event.currentTarget === event.target) setIsDragging(false) }}
            onDrop={(event) => { event.preventDefault(); setIsDragging(false); void addFiles(event.dataTransfer.files) }}
          >
            {browseSection === 'Local Files' && (
              <>
                <label className="library-search"><Search size={15} /><input aria-label="Search music library" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, artist, album or genre" /></label>
                <div className="library-table library-track-table" role="table" aria-label="Local music library">
                  <div className="library-track-row library-head" role="row"><span>TITLE</span><span>ARTIST</span><span>ALBUM</span><span>BPM</span><span>KEY</span><span>SIZE</span><span>LOAD</span></div>
                  {filteredTracks.map((track) => {
                    const loaded = deckByTrackId.get(track.id)
                    const profile = trackProfiles.get(track.id)
                    const liveBpm = loaded ? effectiveBpm(loaded.deck.bpm, loaded.deck.pitchPercent) : 0
                    const bpm = liveBpm > 0 ? liveBpm : profile?.bpm ?? 0
                    const camelotKey = loaded?.key.camelotKey || profile?.camelotKey || '—'
                    return (
                      <div className={`library-track-row${loaded ? ` deck-row-${loaded.deckId.toLowerCase()}` : ''}`} role="row" key={track.id}>
                        <strong title={track.fileName}>{track.title}</strong>
                        <span>{track.artist}</span>
                        <span>{track.album || '—'}</span>
                        <span>{bpm > 0 ? bpm.toFixed(1) : '—'}</span>
                        <span>{camelotKey}</span>
                        <span>{formatBytes(track.size)}</span>
                        <div className="library-actions">
                          <button type="button" aria-label={`Load ${track.title} to deck A`} onClick={() => requestDeckLoad('A', track.id)}>A</button>
                          <button type="button" aria-label={`Load ${track.title} to deck B`} onClick={() => requestDeckLoad('B', track.id)}>B</button>
                          <button type="button" aria-label={`Remove ${track.title} from library`} onClick={() => removeTrack(track.id)}><Trash2 size={11} /></button>
                        </div>
                      </div>
                    )
                  })}
                  {filteredTracks.length === 0 && <div className="library-empty">Drop audio files here or use ADD TRACKS. Files stay local in your browser.</div>}
                </div>
              </>
            )}

            {browseSection === 'AI Assistant' && <AiAssistantPanel />}

            {browseSection === 'History' && (
              <div className="library-table history-table" role="table" aria-label="Track history">
                <div className="history-row library-head" role="row"><span>TRACK</span><span>LAST LOADED</span><span>STATUS</span></div>
                {trackHistory.map((item) => <div className="history-row" role="row" key={item.id}><strong>{item.name}</strong><span>{new Date(item.lastLoadedAt).toLocaleString()}</span><span>{libraryTracks.some((track) => track.id === item.id) ? 'Available' : 'Reselect file'}</span></div>)}
                {trackHistory.length === 0 && <div className="library-empty">No tracks have been loaded yet.</div>}
              </div>
            )}

            {browseSection === 'Audius' && <OnlineSourceBrowser source="audius" />}
            {browseSection === 'Jamendo' && <OnlineSourceBrowser source="jamendo" />}
            {isDragging && <div className="library-drop-overlay">DROP AUDIO FILES TO IMPORT</div>}
          </div>
        </div>
      </section>

      <section className="headphone-panel" id="audio-routing" aria-label="Cue mix headphones">
        <div className="dock-tabs"><span>CUE MIX (HEADPHONES)</span></div>
        <div className="headphone-knobs">
          <KnobControl label="CUE" ariaLabel="Dock cue volume" value={cueVolume} min={0} max={1} step={0.01} accent="#29b6ff" valueLabel={`${Math.round(cueVolume * 100)}%`} onChange={(value) => { setCueVolume(value); engine.setCueVolume(value) }} />
          <KnobControl label="MASTER" ariaLabel="Dock master volume" value={masterVolume} min={0} max={1} step={0.01} accent="#dfe7ec" valueLabel={`${Math.round(masterVolume * 100)}%`} onChange={(value) => { setMasterVolume(value); engine.setMasterVolume(value) }} />
        </div>
        <label className="headphone-mix"><span><b>SPLIT</b><b>MIX</b></span><input aria-label="Dock cue master mix" type="range" min="0" max="1" step="0.01" value={cueMix} onChange={(event) => { const value = Number(event.target.value); setCueMix(value); engine.setCueMix(value) }} /></label>
        <AudioSettings />
        <ControllerSettings />
      </section>
    </section>
  )
}
