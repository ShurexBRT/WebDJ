import { useEffect } from 'react'
import { adjustCrossfader, executeControllerCommand, type ControllerCommand } from './controllerCommands'

const KEY_COMMANDS: Record<string, ControllerCommand> = {
  KeyQ: 'playA',
  KeyP: 'playB',
  KeyA: 'cueA',
  KeyL: 'cueB',
  KeyZ: 'nudgeASlower',
  KeyX: 'nudgeAFaster',
  Comma: 'nudgeBSlower',
  Period: 'nudgeBFaster',
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(target.tagName)
}

export function useKeyboardControls(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || isEditableTarget(event.target)) return

      if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
        event.preventDefault()
        adjustCrossfader(event.code === 'ArrowLeft' ? -0.1 : 0.1)
        return
      }

      const command = KEY_COMMANDS[event.code]
      if (!command) return
      event.preventDefault()
      void executeControllerCommand(command)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}

export const KEYBOARD_SHORTCUTS = [
  ['Q', 'Play / pause Deck A'],
  ['P', 'Play / pause Deck B'],
  ['A', 'Headphone cue Deck A'],
  ['L', 'Headphone cue Deck B'],
  ['Z / X', 'Nudge Deck A slow / fast'],
  [', / .', 'Nudge Deck B slow / fast'],
  ['← / →', 'Move crossfader'],
] as const
