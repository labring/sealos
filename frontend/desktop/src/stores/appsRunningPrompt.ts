import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppsRunningPromptState {
  dontShowAgain: boolean;
  setDontShowAgain: (value: boolean) => void;
}

export const useAppsRunningPromptStore = create<AppsRunningPromptState>()(
  persist(
    (set) => ({
      dontShowAgain: false,
      setDontShowAgain: (value: boolean) => set({ dontShowAgain: value })
    }),
    {
      name: 'apps-running-prompt-storage'
    }
  )
);
