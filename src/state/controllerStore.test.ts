import { beforeEach, describe, expect, it } from 'vitest'
import { useControllerStore } from './controllerStore'

describe('controller store', () => {
  beforeEach(() => useControllerStore.getState().reset())

  it('learns clears and restores MIDI mappings', () => {
    useControllerStore.getState().startLearning('crossfader')
    useControllerStore.getState().mapControl('crossfader', '176-1')
    expect(useControllerStore.getState().mappings.crossfader).toBe('176-1')
    expect(useControllerStore.getState().learningCommand).toBeNull()

    useControllerStore.getState().clearMapping('crossfader')
    expect(useControllerStore.getState().mappings.crossfader).toBeUndefined()

    useControllerStore.getState().restoreMappings({ playA: '144-36', volumeB: '176-8' })
    expect(useControllerStore.getState().mappings).toEqual({ playA: '144-36', volumeB: '176-8' })
  })

  it('tracks connection status and input names', () => {
    useControllerStore.getState().setMidiStatus('ready')
    useControllerStore.getState().setInputNames(['Controller One', 'Controller Two'])
    expect(useControllerStore.getState().midiStatus).toBe('ready')
    expect(useControllerStore.getState().inputNames).toEqual(['Controller One', 'Controller Two'])
  })
})
