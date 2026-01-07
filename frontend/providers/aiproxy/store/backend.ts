import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface BackendState {
  aiproxyBackend: string
  currencySymbol: 'shellCoin' | 'usd' | 'cny'
  docUrl: string
  setAiproxyBackend: (backend: string) => void
  setCurrencySymbol: (symbol: 'shellCoin' | 'usd' | 'cny') => void
  setDocUrl: (url: string) => void
}

export const useBackendStore = create<BackendState>()(
  persist(
    (set) => ({
      aiproxyBackend: '',
      currencySymbol: 'shellCoin',
      docUrl: '',
      setAiproxyBackend: (backend) => set({ aiproxyBackend: backend }),
      setCurrencySymbol: (symbol) => set({ currencySymbol: symbol }),
      setDocUrl: (url) => set({ docUrl: url }),
    }),
    {
      name: 'aiproxy-backend-storage',
    }
  )
)
