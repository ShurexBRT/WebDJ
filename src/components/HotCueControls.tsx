import { getAudioEngine } from '../audio/AudioEngine'
import { quantizeTime } from '../audio/phaseSync'
import { effectiveBpm } from '../audio/tempo'
import { formatTime } from '../audio/transport'
import { useMixerStore, type DeckId } from '../state/mixerStore'

const hotCueLabels = ['A', 'B', 'C', 'D', 'E', 'F']

export function HotCueControls({ deckId }: { deckId: DeckId }) {
  const deck = useMixerStore((state) => state.decks[deckId])
  const quantizeEnabled = useMixerStore((state) => state.quantizeEnabled)
  const setDeckTime = useMixerStore((state) => state.setDeckTime)
  const setDeckHotCue = useMixerStore((state) => state.setDeckHotCue)
  const engine = getAudioEngine()
  const bpm = effectiveBpm(deck.bpm, deck.pitchPercent)

  const currentCueTime = () => quantizeEnabled
    ? quantizeTime(deck.currentTime, bpm, deck.beatOffsetSeconds)
    : deck.currentTime

  const activateCue = (index: number) => {
    const cueTime = deck.hotCues[index]
    if (cueTime === null) {
      setDeckHotCue(deckId, index, currentCueTime())
      return
    }
    engine.seek(deckId, cueTime)
    setDeckTime(deckId, cueTime)
  }

  return (
    <section className="hot-cue-bank" aria-label={`Hot cues deck ${deckId}`}>
      <span>HOT CUES · {quantizeEnabled ? 'QNTZ' : 'FREE'}</span>
      <div>
        {hotCueLabels.map((label, index) => {
          const cueTime = deck.hotCues[index]
          return (
            <button
              key={label}
              type="button"
              className={cueTime !== null ? 'set' : ''}
              aria-label={`Hot cue ${label} deck ${deckId}`}
              title={cueTime === null ? `Set hot cue ${label}` : `${formatTime(cueTime)} · right click to clear`}
              disabled={!deck.trackName}
              onClick={() => activateCue(index)}
              onContextMenu={(event) => { event.preventDefault(); setDeckHotCue(deckId, index, null) }}
            >
              {label}
            </button>
          )
        })}
        <button className="hot-cue-add" type="button" disabled title="Six hot cue slots available">+</button>
      </div>
    </section>
  )
}
