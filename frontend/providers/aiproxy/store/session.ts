import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { SessionV1 } from 'sealos-desktop-sdk'

interface SessionState {
  session: SessionV1 | null
  setSession: (session: SessionV1 | null) => void
}

export const useSessionStore = create<SessionState>()(
  persist(
    immer((set) => ({
      session: null as SessionV1 | null,
      setSession: (session) =>
        set((state) => {
          state.session = session
        })
    })),
    {
      name: 'session'
    }
  )
)
