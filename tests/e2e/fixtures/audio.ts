export function createTestWav(
  durationSeconds = 1,
  frequencyHz = 440,
  sampleRate = 8_000,
): Buffer {
  const channelCount = 1
  const bitsPerSample = 16
  const frameCount = Math.max(1, Math.floor(durationSeconds * sampleRate))
  const bytesPerSample = bitsPerSample / 8
  const dataSize = frameCount * channelCount * bytesPerSample
  const buffer = Buffer.alloc(44 + dataSize)

  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(channelCount, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * channelCount * bytesPerSample, 28)
  buffer.writeUInt16LE(channelCount * bytesPerSample, 32)
  buffer.writeUInt16LE(bitsPerSample, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)

  for (let frame = 0; frame < frameCount; frame += 1) {
    const envelope = Math.min(1, frame / 80, (frameCount - frame) / 80)
    const sample = Math.sin((2 * Math.PI * frequencyHz * frame) / sampleRate) * 0.25 * envelope
    buffer.writeInt16LE(Math.round(sample * 32_767), 44 + frame * bytesPerSample)
  }

  return buffer
}

export function testWavFile(
  name = 'test-tone.wav',
  durationSeconds = 1,
  frequencyHz = 440,
) {
  return {
    name,
    mimeType: 'audio/wav',
    buffer: createTestWav(durationSeconds, frequencyHz),
  }
}
