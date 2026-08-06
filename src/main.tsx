import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { registerWebDjServiceWorker } from './pwa/registerServiceWorker'
import './styles.css'
import './render-overrides.css'

void registerWebDjServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
