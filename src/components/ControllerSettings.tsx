import { Keyboard, Radio, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { CONTROLLER_COMMAND_LABELS, CONTROLLER_COMMANDS, type ControllerCommand } from '../controllers/controllerCommands'
import { KEYBOARD_SHORTCUTS } from '../controllers/useKeyboardControls'
import { useMidiController } from '../controllers/useMidiController'
import { useControllerStore } from '../state/controllerStore'
import './controllerSettings.css'

export function ControllerSettings() {
  const { connectMidi } = useMidiController()
  const [selectedCommand, setSelectedCommand] = useState<ControllerCommand>('playA')
  const midiStatus = useControllerStore((state) => state.midiStatus)
  const inputNames = useControllerStore((state) => state.inputNames)
  const mappings = useControllerStore((state) => state.mappings)
  const learningCommand = useControllerStore((state) => state.learningCommand)
  const startLearning = useControllerStore((state) => state.startLearning)
  const clearMapping = useControllerStore((state) => state.clearMapping)
  const mappedSignature = mappings[selectedCommand]

  return (
    <section className="controller-settings" aria-label="Keyboard and MIDI controls">
      <div className="controller-heading">
        <span><Keyboard size={13} /> CONTROLS</span>
        <strong>{midiStatus === 'ready' ? `${inputNames.length} MIDI` : midiStatus.toUpperCase()}</strong>
      </div>

      <details>
        <summary>Keyboard shortcuts</summary>
        <div className="shortcut-grid">
          {KEYBOARD_SHORTCUTS.map(([key, action]) => <div key={key}><kbd>{key}</kbd><span>{action}</span></div>)}
        </div>
      </details>

      <div className="midi-connect-row">
        <button type="button" onClick={() => void connectMidi()} disabled={midiStatus === 'requesting'}>
          <Radio size={12} /> {midiStatus === 'ready' ? 'REFRESH MIDI' : midiStatus === 'requesting' ? 'CONNECTING…' : 'CONNECT MIDI'}
        </button>
        <span>{inputNames.length > 0 ? inputNames.join(', ') : midiStatus === 'unsupported' ? 'Web MIDI unavailable' : midiStatus === 'denied' ? 'Permission denied' : 'No MIDI input connected'}</span>
      </div>

      <label className="midi-command-select">
        <span>Learn command</span>
        <select aria-label="MIDI command" value={selectedCommand} onChange={(event) => setSelectedCommand(event.target.value as ControllerCommand)}>
          {CONTROLLER_COMMANDS.map((command) => <option key={command} value={command}>{CONTROLLER_COMMAND_LABELS[command]}</option>)}
        </select>
      </label>

      <div className="midi-learn-row">
        <button
          className={learningCommand === selectedCommand ? 'learning' : ''}
          type="button"
          aria-label="Learn selected MIDI command"
          aria-pressed={learningCommand === selectedCommand}
          disabled={midiStatus !== 'ready'}
          onClick={() => startLearning(learningCommand === selectedCommand ? null : selectedCommand)}
        >
          {learningCommand === selectedCommand ? 'MOVE A MIDI CONTROL…' : 'LEARN'}
        </button>
        <code>{mappedSignature ?? 'UNMAPPED'}</code>
        <button type="button" aria-label="Clear selected MIDI mapping" disabled={!mappedSignature} onClick={() => clearMapping(selectedCommand)}><RotateCcw size={12} /></button>
      </div>
    </section>
  )
}
