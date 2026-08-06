const CACHE_PREFIX = 'webdj-studio'
const CACHE_VERSION = 'v1'
const CACHE_NAME = `${CACHE_PREFIX}-${CACHE_VERSION}`

const scopeUrl = new URL(self.registration.scope)
const shellUrls = [
  scopeUrl.href,
  new URL('index.html', scopeUrl).href,
  new URL('manifest.webmanifest', scopeUrl).href,
  new URL('webdj-icon.svg', scopeUrl).href,
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(shellUrls))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

const cacheResponse = async (request, response) => {
  if (!response || !response.ok || response.type === 'opaque') return response
  const cache = await caches.open(CACHE_NAME)
  await cache.put(request, response.clone())
  return response
}

const navigationResponse = async (request) => {
  try {
    return await cacheResponse(request, await fetch(request))
  } catch {
    return (
      await caches.match(scopeUrl.href)
      ?? await caches.match(new URL('index.html', scopeUrl).href)
      ?? Response.error()
    )
  }
}

const assetResponse = async (request) => {
  const cached = await caches.match(request)
  if (cached) {
    void fetch(request)
      .then((response) => cacheResponse(request, response))
      .catch(() => undefined)
    return cached
  }

  try {
    return await cacheResponse(request, await fetch(request))
  } catch {
    return Response.error()
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (!['http:', 'https:'].includes(url.protocol)) return
  if (url.origin !== self.location.origin) return
  if (request.headers.has('range')) return

  if (request.mode === 'navigate') {
    event.respondWith(navigationResponse(request))
    return
  }

  if (['script', 'style', 'font', 'image', 'manifest'].includes(request.destination)) {
    event.respondWith(assetResponse(request))
  }
})
