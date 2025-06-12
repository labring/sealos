import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface GuideState {
  listCompleted: boolean;
  createCompleted: boolean;
  detailCompleted: boolean;
  setCreateCompleted: (completed: boolean) => void;
  setDetailCompleted: (completed: boolean) => void;
  setListCompleted: (completed: boolean) => void;
  resetGuideState: (completed: boolean) => void;
}

export const useGuideStore = create<GuideState>()(
  persist(
    (set) => ({
      listCompleted: true,
      createCompleted: true,
      detailCompleted: true,
      setCreateCompleted: (completed) => set({ createCompleted: completed }),
      setDetailCompleted: (completed) => set({ detailCompleted: completed }),
      setListCompleted: (completed) => set({ listCompleted: completed }),
      resetGuideState: (completed) =>
        set({ createCompleted: completed, detailCompleted: completed, listCompleted: completed })
    }),
    {
      name: 'user-guide',
      storage: createJSONStorage(() => sessionStorage)
    }
  )
);
