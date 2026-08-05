import { useState } from 'react'
import { getAudioEngine } from '../audio/AudioEngine'
import { formatTime } from '../audio/transport'
import { useMixerStore, type DeckId } from '../state/mixerStore'

const hotCueLabels = ['A', 'B', 'C', 'D', 'E', 'F']

export function HotCueControls({ deckId }: { deckId: DeckId }) {
  const deck = useMixerStore((state) => state.decks[deckId])
  const setDeckTime = useMixerStore((state) => state.setDeckTime)
  const [hotCues, setHotCues] = useState<Array<number | null>>(() => hotCueLabels.map(() => null))
  const engine = getAudioEngine()

  const activateCue = (index: number) => {
    const cueTime = hotCues[index]
    if (cueTime === null) {
      setHotCues((current) => current.map((value, itemIndex) => itemIndex === index ? deck.currentTime : value))
      return
    }
    engine.seek(deckId, cueTime)
    setDeckTime(deckId, cueTime)
  }

  const clearCue = (index: number) => {
    setHotCues((current) => current.map((value, itemIndex) => itemIndex === index ? null : value))
  }

  return (
    <section className="hot-cue-bank" aria-label={`Hot cues deck ${deckId}`}>
      <span>HOT CUES</span>
      <div>
        {hotCueLabels.map((label, index) => {
          const cueTime = hotCues[index]
          return (
            <button
              key={label}
              type="button"
              className={cueTime !== null ? 'set' : ''}
              aria-label={`Hot cue ${label} deck ${deckId}`}
              title={cueTime === null ? `Set hot cue ${label}` : `${formatTime(cueTime)} · right click to clear`}
              disabled={!deck.trackName}
              onClick={() => activateCue(index)}
              onContextMenu={(event) => { event.preventDefault(); clearCue(index) }}
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
