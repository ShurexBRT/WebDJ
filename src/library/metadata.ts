export type TrackMetadata = {
  title: string
  artist: string
  album: string
  genre: string
}

const textDecoder = new TextDecoder('latin1')
const utf8Decoder = new TextDecoder('utf-8')
const utf16Decoder = new TextDecoder('utf-16')

const clean = (value: string) => value.replace(/\0/g, '').trim()

export function metadataFromFileName(fileName: string): TrackMetadata {
  const baseName = fileName.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim()
  const separator = baseName.indexOf(' - ')
  if (separator > 0) {
    return {
      artist: clean(baseName.slice(0, separator)) || 'Unknown artist',
      title: clean(baseName.slice(separator + 3)) || baseName,
      album: '',
      genre: '',
    }
  }
  return { title: baseName || fileName, artist: 'Unknown artist', album: '', genre: '' }
}

function synchsafe(bytes: Uint8Array): number {
  return ((bytes[0] & 0x7f) << 21) | ((bytes[1] & 0x7f) << 14) | ((bytes[2] & 0x7f) << 7) | (bytes[3] & 0x7f)
}

function uint32(bytes: Uint8Array): number {
  return ((bytes[0] << 24) >>> 0) + (bytes[1] << 16) + (bytes[2] << 8) + bytes[3]
}

function decodeTextFrame(bytes: Uint8Array): string {
  if (bytes.length <= 1) return ''
  const encoding = bytes[0]
  const payload = bytes.slice(1)
  if (encoding === 0) return clean(textDecoder.decode(payload))
  if (encoding === 3) return clean(utf8Decoder.decode(payload))
  return clean(utf16Decoder.decode(payload))
}

export function parseId3v2(bytes: Uint8Array): Partial<TrackMetadata> {
  if (bytes.length < 10 || String.fromCharCode(...bytes.slice(0, 3)) !== 'ID3') return {}
  const version = bytes[3]
  const tagSize = synchsafe(bytes.slice(6, 10))
  const end = Math.min(bytes.length, 10 + tagSize)
  const metadata: Partial<TrackMetadata> = {}
  let offset = 10

  while (offset + 10 <= end) {
    const id = String.fromCharCode(...bytes.slice(offset, offset + 4))
    if (!/^[A-Z0-9]{4}$/.test(id)) break
    const sizeBytes = bytes.slice(offset + 4, offset + 8)
    const frameSize = version === 4 ? synchsafe(sizeBytes) : uint32(sizeBytes)
    if (frameSize <= 0 || offset + 10 + frameSize > end) break
    const value = decodeTextFrame(bytes.slice(offset + 10, offset + 10 + frameSize))
    if (id === 'TIT2') metadata.title = value
    if (id === 'TPE1') metadata.artist = value
    if (id === 'TALB') metadata.album = value
    if (id === 'TCON') metadata.genre = value.replace(/^\((\d+)\)$/, '$1')
    offset += 10 + frameSize
  }

  return metadata
}

export function parseId3v1(bytes: Uint8Array): Partial<TrackMetadata> {
  if (bytes.length < 128) return {}
  const tag = bytes.slice(bytes.length - 128)
  if (String.fromCharCode(...tag.slice(0, 3)) !== 'TAG') return {}
  return {
    title: clean(textDecoder.decode(tag.slice(3, 33))),
    artist: clean(textDecoder.decode(tag.slice(33, 63))),
    album: clean(textDecoder.decode(tag.slice(63, 93))),
    genre: tag[127] === 255 ? '' : String(tag[127]),
  }
}

export async function readTrackMetadata(file: File): Promise<TrackMetadata> {
  const fallback = metadataFromFileName(file.name)
  try {
    const head = new Uint8Array(await file.slice(0, Math.min(file.size, 512 * 1024)).arrayBuffer())
    const tail = file.size > 128 ? new Uint8Array(await file.slice(file.size - 128).arrayBuffer()) : head
    const metadata = { ...parseId3v1(tail), ...parseId3v2(head) }
    return {
      title: clean(metadata.title ?? '') || fallback.title,
      artist: clean(metadata.artist ?? '') || fallback.artist,
      album: clean(metadata.album ?? ''),
      genre: clean(metadata.genre ?? ''),
    }
  } catch {
    return fallback
  }
}
