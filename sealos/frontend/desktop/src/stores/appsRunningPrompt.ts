import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppsRunningPromptState {
  dontShowAgain: boolean;
  blockingPageUnload: boolean;
  setBlockingPageUnload: (value: boolean) => void;
  setDontShowAgain: (value: boolean) => void;
}

export const useAppsRunningPromptStore = create<AppsRunningPromptState>()(
  persist(
    (set) => ({
      dontShowAgain: false satisfies boolean,
      blockingPageUnload: true satisfies boolean,
      setBlockingPageUnload: (value: boolean) => set({ blockingPageUnload: value }),
      setDontShowAgain: (value: boolean) => set({ dontShowAgain: value })
    }),
    {
      name: 'apps-running-prompt-storage'
    }
  )
);
