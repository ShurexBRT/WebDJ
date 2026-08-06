import { responseToTrackFile, type FetchLike, type OnlineTrack, type OnlineTrackFile } from './types'

type AudiusClient = ReturnType<(typeof import('@audius/sdk'))['sdk']>

type AudiusTrackRecord = {
  id?: string
  title?: string
  duration?: number
  genre?: string
  mood?: string
  permalink?: string
  downloadable?: boolean
  isStreamable?: boolean | string
  bpm?: number
  musicalKey?: string
  artwork?: {
    _150x150?: string
    _480x480?: string
    _1000x1000?: string
  }
  user?: {
    name?: string
    handle?: string
  }
}

let cachedClient: { apiKey: string; client: AudiusClient } | null = null

async function getAudiusClient(apiKey: string): Promise<AudiusClient> {
  const normalizedKey = apiKey.trim()
  if (!normalizedKey) throw new Error('Audius API Key is required')
  if (cachedClient?.apiKey === normalizedKey) return cachedClient.client

  const { sdk } = await import('@audius/sdk')
  const client = sdk({ apiKey: normalizedKey })
  cachedClient = { apiKey: normalizedKey, client }
  return client
}

export function mapAudiusTracks(records: AudiusTrackRecord[] = []): OnlineTrack[] {
  return records
    .filter((record) => Boolean(record.id))
    .map((record) => {
      const streamable = record.isStreamable !== false && record.isStreamable !== 'false'
      return {
        source: 'audius' as const,
        id: String(record.id),
        title: record.title?.trim() || 'Untitled Audius track',
        artist: record.user?.name?.trim() || record.user?.handle?.trim() || 'Unknown artist',
        album: '',
        genre: record.genre?.trim() || record.mood?.trim() || '',
        durationSeconds: Math.max(0, Number(record.duration) || 0),
        artworkUrl: record.artwork?._480x480 || record.artwork?._150x150 || record.artwork?._1000x1000 || '',
        permalink: record.permalink?.trim() || '',
        streamable,
        downloadAllowed: Boolean(record.downloadable),
        bpm: Number.isFinite(record.bpm) && Number(record.bpm) > 0 ? Number(record.bpm) : null,
        musicalKey: record.musicalKey?.trim() || '',
      }
    })
}

export async function searchAudiusTracks(query: string, apiKey: string): Promise<OnlineTrack[]> {
  if (!query.trim()) return []
  const client = await getAudiusClient(apiKey)
  const response = await client.tracks.searchTracks({
    query: query.trim(),
    limit: 24,
    offset: 0,
    sortMethod: 'relevant',
  })
  return mapAudiusTracks((response.data ?? []) as AudiusTrackRecord[])
}

export async function loadAudiusTrack(
  track: OnlineTrack,
  apiKey: string,
  fetchImpl: FetchLike = fetch,
): Promise<OnlineTrackFile> {
  if (track.source !== 'audius') throw new Error('Expected an Audius track')
  if (!track.streamable) throw new Error('This Audius track is not streamable')

  const normalizedKey = apiKey.trim()
  const client = await getAudiusClient(normalizedKey)
  const streamUrl = await client.tracks.getTrackStreamUrl({
    trackId: track.id,
    apiKey: normalizedKey,
  })
  const response = await fetchImpl(streamUrl, { redirect: 'follow' })
  return responseToTrackFile(response, track)
}

export function clearAudiusClientCache(): void {
  cachedClient = null
}
