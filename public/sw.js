const CACHE_PREFIX = 'webdj-shell-'
const CACHE_VERSION = `${CACHE_PREFIX}v3`
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

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (!isCacheableShellRequest(request, url)) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            void caches.open(CACHE_VERSION).then((cache) => cache.put(`${basePath}index.html`, copy))
          }
          return response
        })
        .catch(async () => (
          await caches.match(`${basePath}index.html`)
          ?? await caches.match(basePath)
          ?? Response.error()
        )),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok && response.type !== 'opaque') {
            const copy = response.clone()
            void caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => cached ?? Response.error())
      return cached ?? network
    }),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting()
})
