export type AudioOutputDevice = {
  deviceId: string
  label: string
}

export type OutputSupport = {
  canEnumerate: boolean
  canSelectOutput: boolean
}

export function calculateMonitorGains(mix: number): { cue: number; master: number } {
  const normalized = Math.min(1, Math.max(0, mix))
  return {
    cue: Math.cos(normalized * Math.PI * 0.5),
    master: Math.sin(normalized * Math.PI * 0.5),
  }
}

export function getOutputSupport(): OutputSupport {
  if (typeof navigator === 'undefined') {
    return { canEnumerate: false, canSelectOutput: false }
  }

  const canEnumerate = Boolean(navigator.mediaDevices?.enumerateDevices)
  const prototype = typeof HTMLMediaElement === 'undefined' ? undefined : HTMLMediaElement.prototype
  const canSelectOutput = Boolean(prototype && 'setSinkId' in prototype)

  return { canEnumerate, canSelectOutput }
}

export function normalizeAudioOutputs(devices: MediaDeviceInfo[]): AudioOutputDevice[] {
  return devices
    .filter((device) => device.kind === 'audiooutput')
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label || (device.deviceId === 'default' ? 'System default' : `Audio output ${index + 1}`),
    }))
}
