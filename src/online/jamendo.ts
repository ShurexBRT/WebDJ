import { responseToTrackFile, type FetchLike, type OnlineTrack, type OnlineTrackFile } from './types'

const JAMENDO_TRACKS_ENDPOINT = 'https://api.jamendo.com/v3.0/tracks/'

type JamendoTrackRecord = {
  id?: string
  name?: string
  artist_name?: string
  album_name?: string
  duration?: number | string
  image?: string
  shareurl?: string
  audio?: string
  audiodownload_allowed?: boolean
  audiodownload?: string
  musicinfo?: {
    tags?: {
      genres?: string[]
    }
  }
}

type JamendoResponse = {
  headers?: {
    status?: string
    error_message?: string
  }
  results?: JamendoTrackRecord[]
}

export function buildJamendoSearchUrl(query: string, clientId: string, limit = 24): string {
  const params = new URLSearchParams({
    client_id: clientId.trim(),
    format: 'json',
    limit: String(Math.max(1, Math.min(50, limit))),
    search: query.trim(),
    type: 'single albumtrack',
    audioformat: 'mp32',
    include: 'musicinfo',
    imagesize: '300',
    order: 'relevance',
  })
  return `${JAMENDO_TRACKS_ENDPOINT}?${params}`
}

export function mapJamendoTracks(records: JamendoTrackRecord[] = []): OnlineTrack[] {
  return records
    .filter((record) => Boolean(record.id && record.audio))
    .map((record) => ({
      source: 'jamendo' as const,
      id: String(record.id),
      title: record.name?.trim() || 'Untitled Jamendo track',
      artist: record.artist_name?.trim() || 'Unknown artist',
      album: record.album_name?.trim() || '',
      genre: record.musicinfo?.tags?.genres?.[0]?.trim() || '',
      durationSeconds: Math.max(0, Number(record.duration) || 0),
      artworkUrl: record.image?.trim() || '',
      permalink: record.shareurl?.trim() || '',
      streamable: Boolean(record.audio),
      downloadAllowed: Boolean(record.audiodownload_allowed && record.audiodownload),
      bpm: null,
      musicalKey: '',
    }))
}

export async function searchJamendoTracks(
  query: string,
  clientId: string,
  fetchImpl: FetchLike = fetch,
): Promise<OnlineTrack[]> {
  if (!clientId.trim()) throw new Error('Jamendo Client ID is required')
  if (!query.trim()) return []

  const response = await fetchImpl(buildJamendoSearchUrl(query, clientId), {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error(`Jamendo search failed with ${response.status}`)

  const payload = await response.json() as JamendoResponse
  if (payload.headers?.status === 'failed') {
    throw new Error(payload.headers.error_message || 'Jamendo rejected the search request')
  }
  return mapJamendoTracks(payload.results)
}

export async function loadJamendoTrack(
  track: OnlineTrack,
  clientId: string,
  fetchImpl: FetchLike = fetch,
): Promise<OnlineTrackFile> {
  if (track.source !== 'jamendo') throw new Error('Expected a Jamendo track')
  if (!clientId.trim()) throw new Error('Jamendo Client ID is required')

  const params = new URLSearchParams({
    client_id: clientId.trim(),
    id: track.id,
    action: 'stream',
    audioformat: 'mp32',
  })
  const response = await fetchImpl(`https://api.jamendo.com/v3.0/tracks/file/?${params}`, {
    redirect: 'follow',
  })
  return responseToTrackFile(response, track)
}
