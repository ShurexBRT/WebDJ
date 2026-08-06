import { ExternalLink, KeyRound, LoaderCircle, Search } from 'lucide-react'
import { useState } from 'react'
import { loadAudiusTrack, searchAudiusTracks } from '../online/audius'
import { loadJamendoTrack, searchJamendoTracks } from '../online/jamendo'
import type { OnlineSourceId, OnlineTrack } from '../online/types'
import { useLibraryStore } from '../state/libraryStore'
import type { DeckId } from '../state/mixerStore'
import { useOnlineSourcesStore } from '../state/onlineSourcesStore'
import './onlineSources.css'

const SOURCE_COPY: Record<OnlineSourceId, { title: string; credential: string; placeholder: string; help: string }> = {
  jamendo: {
    title: 'Jamendo',
    credential: 'Jamendo Client ID',
    placeholder: 'Paste your free Jamendo Client ID',
    help: 'Search and mix Jamendo catalog streams. Audio stays in browser memory and is not exposed as a download.',
  },
  audius: {
    title: 'Audius',
    credential: 'Audius API Key',
    placeholder: 'Paste your free Audius frontend API key',
    help: 'Search and mix public streamable Audius tracks through the official Audius SDK.',
  },
}

const formatDuration = (seconds: number) => {
  const total = Math.max(0, Math.round(seconds))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export function OnlineSourceBrowser({ source }: { source: OnlineSourceId }) {
  const jamendoClientId = useOnlineSourcesStore((state) => state.jamendoClientId)
  const audiusApiKey = useOnlineSourcesStore((state) => state.audiusApiKey)
  const setJamendoClientId = useOnlineSourcesStore((state) => state.setJamendoClientId)
  const setAudiusApiKey = useOnlineSourcesStore((state) => state.setAudiusApiKey)
  const addRemoteTrack = useLibraryStore((state) => state.addRemoteTrack)
  const requestDeckLoad = useLibraryStore((state) => state.requestDeckLoad)
  const [query, setQuery] = useState('')
  const [tracks, setTracks] = useState<OnlineTrack[]>([])
  const [status, setStatus] = useState<'idle' | 'searching' | 'ready' | 'error'>('idle')
  const [error, setError] = useState('')
  const [loadingTrackId, setLoadingTrackId] = useState('')
  const copy = SOURCE_COPY[source]
  const credential = source === 'jamendo' ? jamendoClientId : audiusApiKey
  const setCredential = source === 'jamendo' ? setJamendoClientId : setAudiusApiKey

  const searchTracks = async () => {
    if (!query.trim()) return
    setStatus('searching')
    setError('')
    try {
      const results = source === 'jamendo'
        ? await searchJamendoTracks(query, jamendoClientId)
        : await searchAudiusTracks(query, audiusApiKey)
      setTracks(results)
      setStatus('ready')
    } catch (caught) {
      setTracks([])
      setError(caught instanceof Error ? caught.message : `${copy.title} search failed`)
      setStatus('error')
    }
  }

  const loadToDeck = async (track: OnlineTrack, deckId: DeckId) => {
    setLoadingTrackId(`${track.source}:${track.id}:${deckId}`)
    setError('')
    try {
      const loaded = source === 'jamendo'
        ? await loadJamendoTrack(track, jamendoClientId)
        : await loadAudiusTrack(track, audiusApiKey)
      const libraryTrack = await addRemoteTrack(loaded.file, loaded.track)
      requestDeckLoad(deckId, libraryTrack.id)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : `Unable to load ${track.title}`)
      setStatus('error')
    } finally {
      setLoadingTrackId('')
    }
  }

  return (
    <section className="online-source-browser" aria-label={`${copy.title} music browser`}>
      <header className="online-source-header">
        <div>
          <strong>{copy.title.toUpperCase()}</strong>
          <span>OFFICIAL SOURCE ADAPTER</span>
        </div>
        <p>{copy.help}</p>
      </header>

      <div className="source-credential-row">
        <label>
          <span><KeyRound size={12} /> {copy.credential}</span>
          <input
            aria-label={copy.credential}
            type="password"
            autoComplete="off"
            value={credential}
            placeholder={copy.placeholder}
            onChange={(event) => setCredential(event.target.value)}
          />
        </label>
        <small>Stored only in this browser. No bearer tokens.</small>
      </div>

      <form className="online-search-row" onSubmit={(event) => { event.preventDefault(); void searchTracks() }}>
        <label>
          <Search size={14} />
          <input aria-label={`Search ${copy.title}`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${copy.title} tracks`} />
        </label>
        <button type="submit" disabled={!credential || !query.trim() || status === 'searching'}>
          {status === 'searching' ? <LoaderCircle className="spin" size={14} /> : <Search size={14} />}
          SEARCH
        </button>
      </form>

      {error && <div className="online-source-error" role="alert">{error}</div>}

      <div className="online-track-table" role="table" aria-label={`${copy.title} search results`}>
        <div className="online-track-row online-track-head" role="row">
          <span>TRACK</span><span>GENRE</span><span>BPM</span><span>KEY</span><span>TIME</span><span>LOAD</span>
        </div>
        {tracks.map((track) => (
          <div className="online-track-row" role="row" key={`${track.source}:${track.id}`}>
            <div className="online-track-identity">
              {track.artworkUrl ? <img src={track.artworkUrl} alt="" loading="lazy" /> : <span className="online-art-placeholder" />}
              <div>
                <strong>{track.title}</strong>
                <span>{track.artist}{track.album ? ` · ${track.album}` : ''}</span>
              </div>
            </div>
            <span>{track.genre || '—'}</span>
            <span>{track.bpm ? Math.round(track.bpm) : '—'}</span>
            <span>{track.musicalKey || '—'}</span>
            <span>{formatDuration(track.durationSeconds)}</span>
            <div className="online-load-actions">
              {(['A', 'B'] as DeckId[]).map((deckId) => {
                const loading = loadingTrackId === `${track.source}:${track.id}:${deckId}`
                return <button key={deckId} type="button" disabled={!track.streamable || Boolean(loadingTrackId)} onClick={() => void loadToDeck(track, deckId)}>{loading ? <LoaderCircle className="spin" size={12} /> : deckId}</button>
              })}
              {track.permalink && <a href={track.permalink} target="_blank" rel="noreferrer" aria-label={`Open ${track.title} on ${copy.title}`}><ExternalLink size={12} /></a>}
            </div>
          </div>
        ))}
        {status === 'ready' && tracks.length === 0 && <div className="library-empty">No streamable tracks matched this search.</div>}
        {status === 'idle' && <div className="library-empty">Enter your free source credential, search the catalog, then load a result directly to Deck A or B.</div>}
      </div>
    </section>
  )
}
