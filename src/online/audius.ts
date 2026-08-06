import { responseToTrackFile, type FetchLike, type OnlineTrack, type OnlineTrackFile } from './types'

const AUDIUS_SDK_URL = 'https://cdn.jsdelivr.net/npm/@audius/sdk@15.3.1/dist/sdk.min.js'
const AUDIUS_SCRIPT_ID = 'webdj-audius-sdk'

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

type AudiusClient = {
  tracks: {
    searchTracks: (params: {
      query: string
      limit?: number
      offset?: number
      sortMethod?: string
    }) => Promise<{ data?: AudiusTrackRecord[] | null }>
    getTrackStreamUrl: (params: {
      trackId: string
      apiKey?: string
    }) => Promise<string>
  }
}

type AudiusFactory = (options: { apiKey: string }) => AudiusClient

type WindowWithAudius = Window & typeof globalThis & {
  audiusSdk?: AudiusFactory
}

let sdkPromise: Promise<AudiusFactory> | null = null
let cachedClient: { apiKey: string; client: AudiusClient } | null = null

function loadAudiusFactory(): Promise<AudiusFactory> {
  const audiusWindow = window as WindowWithAudius
  if (audiusWindow.audiusSdk) return Promise.resolve(audiusWindow.audiusSdk)
  if (sdkPromise) return sdkPromise

  const pending = new Promise<AudiusFactory>((resolve, reject) => {
    const existing = document.getElementById(AUDIUS_SCRIPT_ID) as HTMLScriptElement | null
    const script = existing ?? document.createElement('script')

    const finish = () => {
      if (audiusWindow.audiusSdk) resolve(audiusWindow.audiusSdk)
      else reject(new Error('The Audius browser SDK loaded without exposing its client factory'))
    }
    const fail = () => reject(new Error('Unable to load the Audius browser SDK'))

    script.addEventListener('load', finish, { once: true })
    script.addEventListener('error', fail, { once: true })

    if (!existing) {
      script.id = AUDIUS_SCRIPT_ID
      script.src = AUDIUS_SDK_URL
      script.async = true
      script.crossOrigin = 'anonymous'
      document.head.append(script)
    }
  }).catch((error): never => {
    sdkPromise = null
    throw error
  })

  sdkPromise = pending
  return pending
}

async function getAudiusClient(apiKey: string): Promise<AudiusClient> {
  const normalizedKey = apiKey.trim()
  if (!normalizedKey) throw new Error('Audius API Key is required')
  if (cachedClient?.apiKey === normalizedKey) return cachedClient.client

  const factory = await loadAudiusFactory()
  const client = factory({ apiKey: normalizedKey })
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
  return mapAudiusTracks(response.data ?? [])
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
  sdkPromise = null
}
