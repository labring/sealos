import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface GuideState {
  createCompleted: boolean;
  detailCompleted: boolean;
  listCompleted: boolean;
  isGuideEnabled: boolean;
  releaseCompleted: boolean;
  setCreateCompleted: (completed: boolean) => void;
  setDetailCompleted: (completed: boolean) => void;
  setListCompleted: (completed: boolean) => void;
  setGuideEnabled: (enabled: boolean) => void;
  setReleaseCompleted: (completed: boolean) => void;
  resetGuideState: (completed: boolean) => void;
}

export const useGuideStore = create<GuideState>()(
  persist(
    (set) => ({
      createCompleted: false,
      detailCompleted: false,
      listCompleted: false,
      isGuideEnabled: false,
      releaseCompleted: false,
      setCreateCompleted: (completed) => set({ createCompleted: completed }),
      setDetailCompleted: (completed) => set({ detailCompleted: completed }),
      setListCompleted: (completed) => set({ listCompleted: completed }),
      setReleaseCompleted: (completed) => set({ releaseCompleted: completed }),
      setGuideEnabled: (enabled) => set({ isGuideEnabled: enabled }),
      resetGuideState: (completed) =>
        set({ createCompleted: completed, detailCompleted: completed, listCompleted: completed })
    }),
    {
      name: 'user-guide',
      storage: createJSONStorage(() => localStorage)
    }
  )
);
