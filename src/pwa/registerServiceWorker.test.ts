import { describe, expect, it } from 'vitest'
import { serviceWorkerUrl } from './registerServiceWorker'

describe('WebDJ service worker registration', () => {
  it('builds a scoped worker URL with or without a trailing slash', () => {
    expect(serviceWorkerUrl('/WebDJ/')).toBe('/WebDJ/sw.js')
    expect(serviceWorkerUrl('/WebDJ')).toBe('/WebDJ/sw.js')
    expect(serviceWorkerUrl('/')).toBe('/sw.js')
  })
})
