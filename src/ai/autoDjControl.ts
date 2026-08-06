import { useAutoDjStore } from '../state/autoDjStore'
import { cancelAutoTransition } from './transitionExecutor'

export function takeOverAutoDj(): void {
  cancelAutoTransition()
  useAutoDjStore.getState().disable()
}
