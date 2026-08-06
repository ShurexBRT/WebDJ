export type OnlineSourceId = 'jamendo' | 'audius'

export type OnlineTrack = {
  source: OnlineSourceId
  id: string
  title: string
  artist: string
  album: string
  genre: string
  durationSeconds: number
  artworkUrl: string
  permalink: string
  streamable: boolean
  downloadAllowed: boolean
  bpm: number | null
  musicalKey: string
}

export type OnlineSourceCredentials = {
  jamendoClientId: string
  audiusApiKey: string
}

export type OnlineTrackFile = {
  file: File
  track: OnlineTrack
}

export type FetchLike = typeof fetch

export function safeFileName(value: string): string {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._ -]+/g, '')
    .trim()
    .replace(/\s+/g, ' ')
  return normalized || 'online-track'
}

export function extensionForAudioType(contentType: string): string {
  const normalized = contentType.toLowerCase()
  if (normalized.includes('ogg') || normalized.includes('opus')) return 'ogg'
  if (normalized.includes('flac')) return 'flac'
  if (normalized.includes('wav')) return 'wav'
  if (normalized.includes('mp4') || normalized.includes('m4a') || normalized.includes('aac')) return 'm4a'
  return 'mp3'
}

export async function responseToTrackFile(
  response: Response,
  track: OnlineTrack,
): Promise<OnlineTrackFile> {
  if (!response.ok) throw new Error(`Audio request failed with ${response.status}`)
  const blob = await response.blob()
  if (blob.size === 0) throw new Error('The source returned an empty audio file')
  const contentType = blob.type || response.headers.get('content-type') || 'audio/mpeg'
  const extension = extensionForAudioType(contentType)
  const name = safeFileName(`${track.artist} - ${track.title}`)
  return {
    track,
    file: new File([blob], `${name}.${extension}`, {
      type: contentType,
      lastModified: Date.now(),
    }),
  }
}
