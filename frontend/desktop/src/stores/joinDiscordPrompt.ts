import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface JoinDiscordPromptState {
  dontShowAgain: boolean;
  open: boolean;
  autoOpenBlocked: boolean;
  setDontShowAgain: (value: boolean) => void;
  setOpen: (value: boolean) => void;
  blockAutoOpen: () => void;
}

export const useJoinDiscordPromptStore = create<JoinDiscordPromptState>()(
  persist(
    (set, state) => ({
      dontShowAgain: false satisfies boolean,
      open: false satisfies boolean,
      autoOpenBlocked: false satisfies boolean,
      setDontShowAgain: (value: boolean) => set({ dontShowAgain: value }),
      setOpen: (value: boolean) => set({ open: value }),
      blockAutoOpen: () => {
        if (!state().autoOpenBlocked) {
          set({ autoOpenBlocked: true });
        }
      }
    }),
    {
      name: 'join-discord-prompt-storage',
      partialize: (state) => ({
        dontShowAgain: state.dontShowAgain
      })
    }
  )
);
