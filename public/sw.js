const CACHE_PREFIX = 'webdj-shell-'
const CACHE_VERSION = `${CACHE_PREFIX}v4`
const scopeUrl = new URL(self.registration.scope)
const basePath = scopeUrl.pathname.endsWith('/') ? scopeUrl.pathname : `${scopeUrl.pathname}/`
const shellAssets = [
  basePath,
  `${basePath}index.html`,
  `${basePath}manifest.webmanifest`,
  `${basePath}icons/webdj.svg`,
  `${basePath}icons/webdj-maskable.svg`,
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(shellAssets)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_VERSION)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  )
})

const isCacheableShellRequest = (request, url) => {
  if (request.method !== 'GET' || request.headers.has('range')) return false
  if (url.origin !== self.location.origin || !url.pathname.startsWith(basePath)) return false
  if (request.destination === 'audio' || request.destination === 'video') return false
  return ['document', 'script', 'style', 'font', 'image', 'manifest', 'worker'].includes(request.destination)
}

const putInShellCache = async (request, response) => {
  if (!response.ok || response.type === 'opaque') return
  const cache = await caches.open(CACHE_VERSION)
  await cache.put(request, response.clone())
}

const networkFirst = async (request, fallbackRequest = request) => {
  try {
    const response = await fetch(request, { cache: 'no-store' })
    void putInShellCache(fallbackRequest, response)
    return response
  } catch {
    return await caches.match(fallbackRequest) ?? Response.error()
  }
}

const isVersionedAsset = (url) => url.pathname.startsWith(`${basePath}assets/`)

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (!isCacheableShellRequest(request, url)) return

  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, `${basePath}index.html`)
        .then(async (response) => response.ok
          ? response
          : await caches.match(basePath) ?? response),
    )
    return
  }

  // Vite assets are content-hashed. Once a particular URL has loaded it is safe to
  // serve cache-first, while stable shell URLs (manifest/icons/etc.) should prefer
  // the newest network response after a deployment.
  if (isVersionedAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          void putInShellCache(request, response)
          return response
        })
      }),
    )
    return
  }

  event.respondWith(networkFirst(request))
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting()
})
