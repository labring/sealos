import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface GuideState {
  createCompleted: boolean;
  detailCompleted: boolean;
  setCreateCompleted: (completed: boolean) => void;
  setDetailCompleted: (completed: boolean) => void;
  resetGuideState: (completed: boolean) => void;
}

export const useGuideStore = create<GuideState>()(
  persist(
    (set) => ({
      createCompleted: false,
      detailCompleted: false,
      setCreateCompleted: (completed) => set({ createCompleted: completed }),
      setDetailCompleted: (completed) => set({ detailCompleted: completed }),
      resetGuideState: (completed) =>
        set({ createCompleted: completed, detailCompleted: completed })
    }),
    {
      name: 'user-guide',
      storage: createJSONStorage(() => localStorage)
    }
  )
);
