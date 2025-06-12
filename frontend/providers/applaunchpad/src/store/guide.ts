import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface GuideState {
  createCompleted: boolean;
  detailCompleted: boolean;
  listCompleted: boolean;
  appName: string;
  setCreateCompleted: (completed: boolean) => void;
  setDetailCompleted: (completed: boolean) => void;
  setListCompleted: (completed: boolean) => void;
  setAppName: (name: string) => void;
  resetGuideState: (completed: boolean) => void;
}

// true = guide is completed, dev mode edit this to false
export const useGuideStore = create<GuideState>()(
  persist(
    (set) => ({
      listCompleted: true,
      createCompleted: true,
      detailCompleted: true,
      appName: '',
      setCreateCompleted: (completed) => set({ createCompleted: completed }),
      setDetailCompleted: (completed) => set({ detailCompleted: completed }),
      setListCompleted: (completed) => set({ listCompleted: completed }),
      setAppName: (name) => set({ appName: name }),
      resetGuideState: (completed) =>
        set({ createCompleted: completed, detailCompleted: completed, listCompleted: completed })
    }),
    {
      name: 'user-guide',
      storage: createJSONStorage(() => sessionStorage)
    }
  )
);
