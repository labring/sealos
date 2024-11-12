import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface BackendState {
  aiproxyBackend: string
  setAiproxyBackend: (backend: string) => void
}

export const useBackendStore = create<BackendState>()(
  persist(
    (set) => ({
      aiproxyBackend: '',
      setAiproxyBackend: (backend) => set({ aiproxyBackend: backend })
    }),
    {
      name: 'aiproxy-backend-storage'
    }
  )
)
