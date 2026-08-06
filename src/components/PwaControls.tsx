import { Download, RefreshCw, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import './pwaControls.css'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches === true

export function PwaControls() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [offline, setOffline] = useState(() => !navigator.onLine)
  const [updateRegistration, setUpdateRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [installed, setInstalled] = useState(isStandalone)

  useEffect(() => {
    const onOnline = () => setOffline(false)
    const onOffline = () => setOffline(true)
    const onInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setInstallPrompt(null)
    }

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    window.addEventListener('beforeinstallprompt', onInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)

    let controllerReloadPending = false
    const onControllerChange = () => {
      if (controllerReloadPending) return
      controllerReloadPending = true
      window.location.reload()
    }

    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
      void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
        .then((registration) => {
          if (registration.waiting) setUpdateRegistration(registration)
          registration.addEventListener('updatefound', () => {
            const worker = registration.installing
            if (!worker) return
            worker.addEventListener('statechange', () => {
              if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateRegistration(registration)
              }
            })
          })
        })
        .catch(() => undefined)
    }

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('beforeinstallprompt', onInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
      navigator.serviceWorker?.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  const install = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome !== 'accepted') setInstallPrompt(null)
  }

  const applyUpdate = () => {
    updateRegistration?.waiting?.postMessage({ type: 'SKIP_WAITING' })
  }

  if (!offline && !updateRegistration && (!installPrompt || installed)) return null

  return (
    <section className="pwa-controls" aria-label="Application install and offline status" aria-live="polite">
      {offline && <span className="pwa-offline"><WifiOff size={12} /> OFFLINE</span>}
      {installPrompt && !installed && <button type="button" aria-label="Install WebDJ" onClick={() => void install()}><Download size={12} /> INSTALL</button>}
      {updateRegistration && <button type="button" aria-label="Update WebDJ" onClick={applyUpdate}><RefreshCw size={12} /> UPDATE</button>}
    </section>
  )
}
