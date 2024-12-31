import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface GuideState {
  createCompleted: boolean
  detailCompleted: boolean
  listCompleted: boolean
  isGuideEnabled: boolean
  setCreateCompleted: (completed: boolean) => void
  setDetailCompleted: (completed: boolean) => void
  setListCompleted: (completed: boolean) => void
  setGuideEnabled: (enabled: boolean) => void
  resetGuideState: (completed: boolean) => void
}

export const useGuideStore = create<GuideState>()(
  persist(
    (set) => ({
      createCompleted: false,
      detailCompleted: false,
      listCompleted: false,
      isGuideEnabled: false,
      setCreateCompleted: (completed) => set({ createCompleted: false }),
      setDetailCompleted: (completed) => set({ detailCompleted: false }),
      setListCompleted: (completed) => set({ listCompleted: false }),
      setGuideEnabled: (enabled) => set({ isGuideEnabled: enabled }),
      resetGuideState: (completed) =>
        set({ createCompleted: completed, detailCompleted: completed, listCompleted: completed })
    }),
    {
      name: 'user-guide',
      storage: createJSONStorage(() => localStorage)
    }
  )
)
