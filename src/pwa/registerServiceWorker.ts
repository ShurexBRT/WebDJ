export const PWA_UPDATE_EVENT = 'webdj:pwa-update-available'

export function serviceWorkerUrl(baseUrl: string): string {
  const normalized = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return `${normalized}sw.js`
}

export async function registerWebDjServiceWorker(baseUrl = import.meta.env.BASE_URL): Promise<ServiceWorkerRegistration | null> {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return null

  try {
    const registration = await navigator.serviceWorker.register(serviceWorkerUrl(baseUrl), { scope: baseUrl })

    const announceUpdate = () => {
      if (!registration.waiting || !navigator.serviceWorker.controller) return
      window.dispatchEvent(new CustomEvent(PWA_UPDATE_EVENT))
    }

    announceUpdate()
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing
      if (!worker) return
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed') announceUpdate()
      })
    })

    return registration
  } catch (error) {
    console.warn('WebDJ service worker registration failed', error)
    return null
  }
}

export async function activateWaitingServiceWorker(baseUrl = import.meta.env.BASE_URL): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false
  const registration = await navigator.serviceWorker.getRegistration(baseUrl)
  if (!registration?.waiting) return false
  registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  return true
}
