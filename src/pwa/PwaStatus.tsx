import { Download, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { activateWaitingServiceWorker, PWA_UPDATE_EVENT } from './registerServiceWorker'
import './pwa.css'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform?: string }>
}

const standaloneMode = () => (
  window.matchMedia?.('(display-mode: standalone)').matches
  || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
)

export function PwaStatus() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)
  const [isInstalled, setIsInstalled] = useState(standaloneMode)
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }
    const handleInstalled = () => {
      setInstallPrompt(null)
      setIsInstalled(true)
    }
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    const handleUpdate = () => setUpdateAvailable(true)

    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener(PWA_UPDATE_EVENT, handleUpdate)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener(PWA_UPDATE_EVENT, handleUpdate)
    }
  }, [])

  const install = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') setInstallPrompt(null)
  }

  const update = async () => {
    const activated = await activateWaitingServiceWorker()
    if (!activated) {
      setUpdateAvailable(false)
      return
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true })
    }
  }

  if (updateAvailable) {
    return <button className="pwa-status update" type="button" aria-label="Update WebDJ" onClick={update}><RefreshCw size={13} /> UPDATE</button>
  }

  if (installPrompt && !isInstalled) {
    return <button className="pwa-status install" type="button" aria-label="Install WebDJ" onClick={install}><Download size={13} /> INSTALL</button>
  }

  return (
    <span className={`pwa-status passive${isOnline ? '' : ' offline'}`} role="status" aria-label={isOnline ? 'WebDJ online' : 'WebDJ offline'}>
      {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
      {isInstalled ? 'APP' : isOnline ? 'ONLINE' : 'OFFLINE'}
    </span>
  )
}
