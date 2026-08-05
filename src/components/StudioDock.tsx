import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { effectiveBpm } from '../audio/tempo'
import { formatTime } from '../audio/transport'
import { getAudioEngine } from '../audio/AudioEngine'
import { AudioSettings } from '../features/settings/AudioSettings'
import { useMixerStore, type DeckId } from '../state/mixerStore'

const deckIds: DeckId[] = ['A', 'B']

export function StudioDock() {
  const decks = useMixerStore((state) => state.decks)
  const setDeckCue = useMixerStore((state) => state.setDeckCue)
  const setDeckEcho = useMixerStore((state) => state.setDeckEcho)
  const setDeckReverb = useMixerStore((state) => state.setDeckReverb)
  const [query, setQuery] = useState('')
  const engine = getAudioEngine()

  const tracks = useMemo(() => deckIds
    .map((deckId) => ({ deckId, ...decks[deckId] }))
    .filter((track) => track.trackName)
    .filter((track) => track.trackName!.toLowerCase().includes(query.trim().toLowerCase())), [decks, query])

  const toggleCue = async (deckId: DeckId) => {
    await engine.initialize()
    const enabled = !decks[deckId].cueEnabled
    setDeckCue(deckId, enabled)
    engine.setDeckCue(deckId, enabled)
  }

  const toggleEcho = (deckId: DeckId) => {
    const deck = decks[deckId]
    const enabled = !deck.echoEnabled
    setDeckEcho(deckId, { echoEnabled: enabled })
    engine.setDeckEcho(deckId, {
      enabled,
      mix: deck.echoMix,
      timeMs: deck.echoTimeMs,
      feedback: deck.echoFeedback,
    })
  }

  const toggleReverb = (deckId: DeckId) => {
    const deck = decks[deckId]
    const enabled = !deck.reverbEnabled
    setDeckReverb(deckId, { reverbEnabled: enabled })
    engine.setDeckReverb(deckId, { enabled, mix: deck.reverbMix })
  }

  return (
    <section className="studio-dock" id="library-dock" aria-label="Studio library and routing">
      <section className="library-panel">
        <div className="dock-tabs" aria-label="Library navigation">
          <button className="active" type="button">LIBRARY</button>
          <button type="button" onClick={() => document.getElementById('audio-routing')?.scrollIntoView({ behavior: 'smooth' })}>ROUTING</button>
          <span>SESSION TRACKS</span>
        </div>
        <div className="library-body">
          <aside className="library-sidebar">
            <strong>BROWSE</strong>
            <span className="active">Local files</span>
            <span>Loaded decks</span>
            <span>History</span>
          </aside>
          <div className="library-content">
            <label className="library-search">
              <Search size={15} />
              <input aria-label="Search loaded tracks" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search loaded tracks" />
            </label>
            <div className="library-table" role="table" aria-label="Loaded track library">
              <div className="library-row library-head" role="row">
                <span>TITLE</span><span>DECK</span><span>BPM</span><span>TIME</span><span>STATUS</span>
              </div>
              {tracks.map((track) => (
                <div className={`library-row deck-row-${track.deckId.toLowerCase()}`} role="row" key={track.deckId}>
                  <strong>{track.trackName}</strong>
                  <span>Deck {track.deckId}</span>
                  <span>{effectiveBpm(track.bpm, track.pitchPercent) > 0 ? effectiveBpm(track.bpm, track.pitchPercent).toFixed(1) : '—'}</span>
                  <span>{formatTime(track.duration)}</span>
                  <span>{track.isPlaying ? 'Playing' : 'Ready'}</span>
                </div>
              ))}
              {tracks.length === 0 && <div className="library-empty">Load a local track on either deck to start the session library.</div>}
            </div>
          </div>
        </div>
      </section>

      <section className="performance-panel" id="performance-pads" aria-label="Performance quick controls">
        <div className="dock-tabs"><button className="active" type="button">PERFORMANCE</button><span>QUICK PADS</span></div>
        <div className="performance-grid">
          {deckIds.flatMap((deckId) => {
            const deck = decks[deckId]
            return [
              <button key={`${deckId}-cue`} className={`performance-pad pad-${deckId.toLowerCase()}${deck.cueEnabled ? ' active' : ''}`} type="button" aria-pressed={deck.cueEnabled} onClick={() => toggleCue(deckId)}><span>DECK {deckId}</span>CUE</button>,
              <button key={`${deckId}-echo`} className={`performance-pad pad-${deckId.toLowerCase()}${deck.echoEnabled ? ' active' : ''}`} type="button" aria-pressed={deck.echoEnabled} onClick={() => toggleEcho(deckId)}><span>DECK {deckId}</span>ECHO</button>,
              <button key={`${deckId}-reverb`} className={`performance-pad pad-${deckId.toLowerCase()}${deck.reverbEnabled ? ' active' : ''}`} type="button" aria-pressed={deck.reverbEnabled} onClick={() => toggleReverb(deckId)}><span>DECK {deckId}</span>REVERB</button>,
            ]
          })}
        </div>
      </section>

      <div id="audio-routing" className="routing-dock">
        <AudioSettings />
      </div>
    </section>
  )
}
