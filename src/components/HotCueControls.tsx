import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { getAudioEngine } from '../audio/AudioEngine'
import { quantizeTime } from '../audio/phaseSync'
import { beginDeckSlip, endDeckSlip, isDeckSlipActive } from '../audio/slipEngine'
import { formatTime } from '../audio/transport'
import { useMixerStore, type DeckId } from '../state/mixerStore'
import { useSlipStore } from '../state/slipStore'

const hotCueLabels = ['A', 'B', 'C', 'D', 'E', 'F']

export function HotCueControls({ deckId }: { deckId: DeckId }) {
  const deck = useMixerStore((state) => state.decks[deckId])
  const quantizeEnabled = useMixerStore((state) => state.quantizeEnabled)
  const setDeckTime = useMixerStore((state) => state.setDeckTime)
  const setDeckHotCue = useMixerStore((state) => state.setDeckHotCue)
  const slipEnabled = useSlipStore((state) => state.enabled[deckId])
  const setSlipActive = useSlipStore((state) => state.setActive)
  const handledPresses = useRef(new Set<number>())
  const engine = getAudioEngine()

  const currentCueTime = () => {
    const playhead = engine.getDeckCurrentTime(deckId) || deck.currentTime
    return quantizeEnabled
      ? quantizeTime(playhead, deck.bpm, deck.beatOffsetSeconds)
      : playhead
  }

  const seekCue = (cueTime: number) => {
    engine.seek(deckId, cueTime)
    setDeckTime(deckId, cueTime)
  }

  const activateCue = (index: number) => {
    const cueTime = deck.hotCues[index]
    if (cueTime === null) {
      setDeckHotCue(deckId, index, currentCueTime())
      return
    }
    seekCue(cueTime)
  }

  const beginCuePress = (index: number) => {
    const cueTime = deck.hotCues[index]
    if (cueTime === null || !slipEnabled || !deck.isPlaying) return false
    handledPresses.current.add(index)
    beginDeckSlip(engine, deckId, `hot-cue-${index}`)
    setSlipActive(deckId, isDeckSlipActive(engine, deckId))
    seekCue(cueTime)
    return true
  }

  const releaseCuePress = (index: number) => {
    if (!handledPresses.current.has(index)) return
    const returnTime = endDeckSlip(engine, deckId, `hot-cue-${index}`)
    setSlipActive(deckId, isDeckSlipActive(engine, deckId))
    if (returnTime !== null) setDeckTime(deckId, returnTime)
  }

  return (
    <section className="hot-cue-bank" aria-label={`Hot cues deck ${deckId}`}>
      <span>HOT CUES · {quantizeEnabled ? 'QNTZ' : 'FREE'}{slipEnabled ? ' · SLIP' : ''}</span>
      <div>
        {hotCueLabels.map((label, index) => {
          const cueTime = deck.hotCues[index]
          return (
            <button
              key={label}
              type="button"
              className={cueTime !== null ? 'set' : ''}
              aria-label={`Hot cue ${label} deck ${deckId}`}
              title={cueTime === null ? `Set hot cue ${label}` : `${formatTime(cueTime)} · hold in Slip mode · right click to clear`}
              disabled={!deck.trackName}
              onPointerDown={(event: PointerEvent<HTMLButtonElement>) => {
                if (event.button === 0) beginCuePress(index)
              }}
              onPointerUp={() => releaseCuePress(index)}
              onPointerCancel={() => {
                releaseCuePress(index)
                handledPresses.current.delete(index)
              }}
              onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
                if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return
                if (beginCuePress(index)) event.preventDefault()
              }}
              onKeyUp={(event: KeyboardEvent<HTMLButtonElement>) => {
                if (event.key === 'Enter' || event.key === ' ') releaseCuePress(index)
              }}
              onClick={() => {
                if (handledPresses.current.has(index)) {
                  handledPresses.current.delete(index)
                  return
                }
                activateCue(index)
              }}
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
