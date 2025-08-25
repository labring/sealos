import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface BackendState {
  aiproxyBackend: string
  currencySymbol: 'shellCoin' | 'usd' | 'cny'
  docUrl: string
  invitationUrl: string
  isInvitationActive: boolean
  setAiproxyBackend: (backend: string) => void
  setCurrencySymbol: (symbol: 'shellCoin' | 'usd' | 'cny') => void
  setDocUrl: (url: string) => void
  setIsInvitationActive: (active: boolean) => void
  setInvitationUrl: (url: string) => void
}

export const useBackendStore = create<BackendState>()(
  persist(
    (set) => ({
      aiproxyBackend: '',
      currencySymbol: 'shellCoin',
      docUrl: '',
      invitationUrl: '',
      isInvitationActive: false,
      setAiproxyBackend: (backend) => set({ aiproxyBackend: backend }),
      setCurrencySymbol: (symbol) => set({ currencySymbol: symbol }),
      setDocUrl: (url) => set({ docUrl: url }),
      setIsInvitationActive: (active) => set({ isInvitationActive: active }),
      setInvitationUrl: (url) => set({ invitationUrl: url })
    }),
    {
      name: 'aiproxy-backend-storage'
    }
  )
)
