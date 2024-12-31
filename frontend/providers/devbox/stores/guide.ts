import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface GuideState {
  createCompleted: boolean
  detailCompleted: boolean
  isGuideEnabled: boolean
  setCreateCompleted: (completed: boolean) => void
  setDetailCompleted: (completed: boolean) => void
  setGuideEnabled: (enabled: boolean) => void

  resetGuideState: (completed: boolean) => void
}

export const useGuideStore = create<GuideState>()(
  persist(
    (set) => ({
      createCompleted: false,
      detailCompleted: false,
      isGuideEnabled: false,
      setCreateCompleted: (completed) => set({ createCompleted: false }),
      setDetailCompleted: (completed) => set({ detailCompleted: false }),
      setGuideEnabled: (enabled) => set({ isGuideEnabled: enabled }),
      resetGuideState: (completed) =>
        set({ createCompleted: completed, detailCompleted: completed })
    }),
    {
      name: 'user-guide',
      storage: createJSONStorage(() => localStorage)
    }
  )
)
