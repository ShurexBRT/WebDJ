import { getAudioEngine } from '../audio/AudioEngine'
import { useMixerStore, type DeckId } from '../state/mixerStore'

export const CONTROLLER_COMMANDS = [
  'playA',
  'playB',
  'cueA',
  'cueB',
  'nudgeASlower',
  'nudgeAFaster',
  'nudgeBSlower',
  'nudgeBFaster',
  'crossfader',
  'volumeA',
  'volumeB',
  'filterA',
  'filterB',
] as const

export type ControllerCommand = typeof CONTROLLER_COMMANDS[number]

export const CONTROLLER_COMMAND_LABELS: Record<ControllerCommand, string> = {
  playA: 'Play / pause Deck A',
  playB: 'Play / pause Deck B',
  cueA: 'Headphone cue Deck A',
  cueB: 'Headphone cue Deck B',
  nudgeASlower: 'Nudge Deck A slower',
  nudgeAFaster: 'Nudge Deck A faster',
  nudgeBSlower: 'Nudge Deck B slower',
  nudgeBFaster: 'Nudge Deck B faster',
  crossfader: 'Crossfader',
  volumeA: 'Channel level Deck A',
  volumeB: 'Channel level Deck B',
  filterA: 'Filter Deck A',
  filterB: 'Filter Deck B',
}

const clampMidi = (value: number) => Math.min(127, Math.max(0, Number.isFinite(value) ? value : 0))
const unipolar = (value: number) => clampMidi(value) / 127
const bipolar = (value: number) => unipolar(value) * 2 - 1

async function togglePlay(deckId: DeckId): Promise<void> {
  const state = useMixerStore.getState()
  const deck = state.decks[deckId]
  if (!deck.trackName) return
  const engine = getAudioEngine()
  if (deck.isPlaying) {
    engine.pause(deckId)
    state.setPlaying(deckId, false)
    return
  }
  await engine.play(deckId)
  state.setPlaying(deckId, true)
}

function toggleCue(deckId: DeckId): void {
  const state = useMixerStore.getState()
  const enabled = !state.decks[deckId].cueEnabled
  state.setDeckCue(deckId, enabled)
  getAudioEngine().setDeckCue(deckId, enabled)
}

export async function executeControllerCommand(command: ControllerCommand, midiValue = 127): Promise<void> {
  const state = useMixerStore.getState()
  const engine = getAudioEngine()

  switch (command) {
    case 'playA': return togglePlay('A')
    case 'playB': return togglePlay('B')
    case 'cueA': toggleCue('A'); return
    case 'cueB': toggleCue('B'); return
    case 'nudgeASlower': engine.nudgeDeck('A', -1); return
    case 'nudgeAFaster': engine.nudgeDeck('A', 1); return
    case 'nudgeBSlower': engine.nudgeDeck('B', -1); return
    case 'nudgeBFaster': engine.nudgeDeck('B', 1); return
    case 'crossfader': {
      const value = bipolar(midiValue)
      state.setCrossfader(value)
      engine.setCrossfader(value)
      return
    }
    case 'volumeA':
    case 'volumeB': {
      const deckId: DeckId = command === 'volumeA' ? 'A' : 'B'
      const value = unipolar(midiValue)
      state.setDeckVolume(deckId, value)
      engine.setDeckVolume(deckId, value)
      return
    }
    case 'filterA':
    case 'filterB': {
      const deckId: DeckId = command === 'filterA' ? 'A' : 'B'
      const value = bipolar(midiValue)
      state.setDeckFilter(deckId, value)
      engine.setDeckFilter(deckId, value)
    }
  }
}

export function adjustCrossfader(delta: number): void {
  const state = useMixerStore.getState()
  const value = Math.min(1, Math.max(-1, state.crossfader + delta))
  state.setCrossfader(value)
  getAudioEngine().setCrossfader(value)
}
