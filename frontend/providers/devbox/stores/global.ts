import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

export type IDEType = 'vscode' | 'cursor' | 'vscodeInsider'

type State = {
  screenWidth: number
  setScreenWidth: (e: number) => void
  loading: boolean
  setLoading: (val: boolean) => void
  lastRoute: string
  setLastRoute: (val: string) => void
  currentIDE: IDEType
  setCurrentIDE: (val: IDEType) => void
}

export const useGlobalStore = create<State>()(
  devtools(
    immer((set, get) => ({
      screenWidth: 1440,
      setScreenWidth(e: number) {
        set((state) => {
          state.screenWidth = e
        })
      },
      loading: false,
      setLoading(val: boolean) {
        set((state) => {
          state.loading = val
        })
      },
      lastRoute: '/',
      setLastRoute(val) {
        set((state) => {
          state.lastRoute = val
        })
      },
      currentIDE: 'vscode',
      setCurrentIDE(val: IDEType) {
        set((state) => {
          state.currentIDE = val
          if (typeof window !== 'undefined') {
            localStorage.setItem('currentIDE', val)
          }
        })
      }
    }))
  )
)

if (typeof window !== 'undefined') {
  const storedIDE = localStorage.getItem('currentIDE') as IDEType
  if (storedIDE) {
    useGlobalStore.getState().setCurrentIDE(storedIDE)
  }
}
