import { FolderOpen, Headphones, History, ListMusic, Search, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { effectiveBpm } from '../audio/tempo'
import { formatTime } from '../audio/transport'
import { getAudioEngine } from '../audio/AudioEngine'
import { AudioSettings } from '../features/settings/AudioSettings'
import { useMixerStore, type DeckId } from '../state/mixerStore'
import { KnobControl } from './KnobControl'

const deckIds: DeckId[] = ['A', 'B']
const samplePads = [
  { name: 'Kick', tone: 62, duration: .22, kind: 'sine' as OscillatorType, className: 'red' },
  { name: 'Clap', tone: 0, duration: .11, kind: 'noise' as const, className: 'orange' },
  { name: 'Hat', tone: 0, duration: .055, kind: 'noise' as const, className: 'yellow' },
  { name: 'Snare', tone: 170, duration: .12, kind: 'triangle' as OscillatorType, className: 'green' },
  { name: 'Bass', tone: 96, duration: .28, kind: 'sawtooth' as OscillatorType, className: 'cyan' },
  { name: 'Synth', tone: 330, duration: .3, kind: 'square' as OscillatorType, className: 'blue' },
  { name: 'Vocal', tone: 440, duration: .36, kind: 'sine' as OscillatorType, className: 'purple' },
  { name: 'FX Rise', tone: 540, duration: .42, kind: 'sawtooth' as OscillatorType, className: 'pink' },
  { name: 'Impact', tone: 48, duration: .5, kind: 'triangle' as OscillatorType, className: 'magenta' },
]

function triggerTone(context: AudioContext, frequency: number, duration: number, type: OscillatorType, rising = false) {
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, context.currentTime)
  if (rising) oscillator.frequency.exponentialRampToValueAtTime(Math.max(frequency * 2.4, frequency + 1), context.currentTime + duration)
  else oscillator.frequency.exponentialRampToValueAtTime(Math.max(28, frequency * .55), context.currentTime + duration)
  gain.gain.setValueAtTime(.22, context.currentTime)
  gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + duration)
  oscillator.connect(gain).connect(context.destination)
  oscillator.start()
  oscillator.stop(context.currentTime + duration)
}

function triggerNoise(context: AudioContext, duration: number, bright = false) {
  const length = Math.max(1, Math.floor(context.sampleRate * duration))
  const buffer = context.createBuffer(1, length, context.sampleRate)
  const data = buffer.getChannelData(0)
  for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1
  const source = context.createBufferSource()
  const filter = context.createBiquadFilter()
  const gain = context.createGain()
  source.buffer = buffer
  filter.type = bright ? 'highpass' : 'bandpass'
  filter.frequency.value = bright ? 6200 : 1800
  gain.gain.setValueAtTime(bright ? .12 : .18, context.currentTime)
  gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + duration)
  source.connect(filter).connect(gain).connect(context.destination)
  source.start()
}

export function StudioDock() {
  const decks = useMixerStore((state) => state.decks)
  const cueVolume = useMixerStore((state) => state.cueVolume)
  const cueMix = useMixerStore((state) => state.cueMix)
  const masterVolume = useMixerStore((state) => state.masterVolume)
  const setCueVolume = useMixerStore((state) => state.setCueVolume)
  const setCueMix = useMixerStore((state) => state.setCueMix)
  const setMasterVolume = useMixerStore((state) => state.setMasterVolume)
  const [query, setQuery] = useState('')
  const [browseSection, setBrowseSection] = useState('Local Files')
  const engine = getAudioEngine()

  const tracks = useMemo(() => deckIds
    .map((deckId) => ({ deckId, ...decks[deckId] }))
    .filter((track) => track.trackName)
    .filter((track) => track.trackName!.toLowerCase().includes(query.trim().toLowerCase())), [decks, query])

  const playSample = async (name: string) => {
    const sample = samplePads.find((item) => item.name === name)
    if (!sample) return
    await engine.initialize()
    if (engine.context.state === 'suspended') await engine.context.resume()
    if (sample.kind === 'noise') {
      triggerNoise(engine.context, sample.duration, sample.name === 'Hat')
      return
    }
    triggerTone(engine.context, sample.tone, sample.duration, sample.kind, sample.name === 'FX Rise')
  }

  return (
    <section className="studio-dock" id="library-dock" aria-label="Studio library and routing">
      <section className="library-panel">
        <div className="dock-tabs" aria-label="Library navigation"><button className="active" type="button">LIBRARY</button><span>TRACK BROWSER</span></div>
        <div className="library-body">
          <aside className="library-sidebar">
            <strong>BROWSE</strong>
            {[
              ['Search', <Search size={13} />],
              ['Trending', <Sparkles size={13} />],
              ['Genres', <ListMusic size={13} />],
              ['Moods', <Headphones size={13} />],
              ['Playlists', <ListMusic size={13} />],
              ['Audius', <Sparkles size={13} />],
              ['Jamendo', <Sparkles size={13} />],
              ['Local Files', <FolderOpen size={13} />],
              ['History', <History size={13} />],
            ].map(([label, icon]) => <button key={String(label)} className={browseSection === label ? 'active' : ''} type="button" onClick={() => setBrowseSection(String(label))}>{icon}{label}</button>)}
          </aside>
          <div className="library-content">
            <label className="library-search"><Search size={15} /><input aria-label="Search loaded tracks" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" /></label>
            <div className="library-table" role="table" aria-label="Loaded track library">
              <div className="library-row library-head" role="row"><span>TITLE</span><span>ARTIST</span><span>BPM</span><span>KEY</span><span>TIME</span><span>SOURCE</span></div>
              {tracks.map((track) => (
                <div className={`library-row deck-row-${track.deckId.toLowerCase()}`} role="row" key={track.deckId}>
                  <strong>{track.trackName}</strong><span>Local track</span><span>{effectiveBpm(track.bpm, track.pitchPercent) > 0 ? effectiveBpm(track.bpm, track.pitchPercent).toFixed(0) : '—'}</span><span>—</span><span>{formatTime(track.duration)}</span><span>Local</span>
                </div>
              ))}
              {tracks.length === 0 && <div className="library-empty">{browseSection === 'Local Files' ? 'Load a track on Deck A or Deck B.' : `${browseSection} source is not connected yet.`}</div>}
            </div>
          </div>
        </div>
      </section>

      <section className="sampler-panel" id="sampler-panel" aria-label="Sampler panel">
        <div className="dock-tabs"><button className="active" type="button">SAMPLER</button><button type="button" disabled>AUTOMIX</button><button type="button" disabled>RECORDER</button></div>
        <div className="sampler-grid">
          {samplePads.map((pad) => <button key={pad.name} className={`sampler-pad ${pad.className}`} type="button" onClick={() => playSample(pad.name)}>{pad.name}</button>)}
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
      </section>
    </section>
  )
}
