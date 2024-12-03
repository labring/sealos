import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface BackendState {
  aiproxyBackend: string
  currencySymbol: 'shellCoin' | 'usd' | 'cny'
  setAiproxyBackend: (backend: string) => void
  setCurrencySymbol: (symbol: 'shellCoin' | 'usd' | 'cny') => void
}

export const useBackendStore = create<BackendState>()(
  persist(
    (set) => ({
      aiproxyBackend: '',
      currencySymbol: 'shellCoin',
      setAiproxyBackend: (backend) => set({ aiproxyBackend: backend }),
      setCurrencySymbol: (symbol) => set({ currencySymbol: symbol })
    }),
    {
      name: 'aiproxy-backend-storage'
    }
  )
)
