import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { OnlineSourceCredentials } from '../online/types'

type OnlineSourcesState = OnlineSourceCredentials & {
  setJamendoClientId: (value: string) => void
  setAudiusApiKey: (value: string) => void
  clearCredentials: () => void
}

export const useOnlineSourcesStore = create<OnlineSourcesState>()(persist(
  (set) => ({
    jamendoClientId: '',
    audiusApiKey: '',
    setJamendoClientId: (jamendoClientId) => set({ jamendoClientId: jamendoClientId.trim() }),
    setAudiusApiKey: (audiusApiKey) => set({ audiusApiKey: audiusApiKey.trim() }),
    clearCredentials: () => set({ jamendoClientId: '', audiusApiKey: '' }),
  }),
  {
    name: 'webdj-online-source-credentials-v1',
    version: 1,
  },
))
