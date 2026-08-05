import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { getAudioEngine } from '../../audio/AudioEngine'
import { useMixerStore } from '../../state/mixerStore'

export function AudioSettings() {
  const devices = useMixerStore((state) => state.outputDevices)
  const masterOutputId = useMixerStore((state) => state.masterOutputId)
  const cueOutputId = useMixerStore((state) => state.cueOutputId)
  const outputSelectionSupported = useMixerStore((state) => state.outputSelectionSupported)
  const setDevices = useMixerStore((state) => state.setOutputDevices)
  const setMasterOutputId = useMixerStore((state) => state.setMasterOutputId)
  const setCueOutputId = useMixerStore((state) => state.setCueOutputId)
  const setOutputSelectionSupported = useMixerStore((state) => state.setOutputSelectionSupported)
  const [message, setMessage] = useState('')
  const engine = getAudioEngine()

  const refreshDevices = useCallback(async (requestAccess = false) => {
    try {
      const nextDevices = requestAccess ? await engine.requestOutputAccess() : await engine.listOutputDevices()
      setDevices(nextDevices)
      setMessage(nextDevices.length ? '' : 'No audio outputs were exposed by the browser.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to read audio outputs')
    }
  }, [engine, setDevices])

  useEffect(() => {
    const support = engine.getOutputSupport()
    setOutputSelectionSupported(support.canSelectOutput)
    if (!support.canEnumerate) return
    const task = window.setTimeout(() => void refreshDevices(false), 0)
    return () => window.clearTimeout(task)
  }, [engine, refreshDevices, setOutputSelectionSupported])

  return (
    <section className="audio-settings" aria-label="Audio output settings">
      <div className="settings-heading"><div><h2>Audio routing</h2><p>Use separate system outputs for master speakers and cue headphones.</p></div><button className="refresh-devices" onClick={() => refreshDevices(true)}><RefreshCw size={16} /> Detect devices</button></div>
      {!outputSelectionSupported && <div className="routing-warning" role="status">This browser cannot select output devices. Master and cue will use the system default output.</div>}
      <div className="device-grid">
        <label><span>Master output</span><select aria-label="Master output" value={masterOutputId} disabled={!outputSelectionSupported} onChange={async (event) => { const id = event.target.value; try { await engine.initialize(); await engine.setMasterOutput(id); setMasterOutputId(id); setMessage('') } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to set master output') } }}><option value="default">System default</option>{devices.filter((device) => device.deviceId !== 'default').map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>)}</select></label>
        <label><span>Cue output</span><select aria-label="Cue output" value={cueOutputId} disabled={!outputSelectionSupported} onChange={async (event) => { const id = event.target.value; try { await engine.initialize(); await engine.setCueOutput(id); setCueOutputId(id); setMessage('') } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to set cue output') } }}><option value="default">System default</option>{devices.filter((device) => device.deviceId !== 'default').map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>)}</select></label>
      </div>
      {message && <p className="routing-message" role="status">{message}</p>}
    </section>
  )
}
