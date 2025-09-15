import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface JoinDiscordPromptState {
  dontShowAgain: boolean;
  open: boolean;
  closedInSession: boolean;
  setDontShowAgain: (value: boolean) => void;
  setOpen: (value: boolean) => void;
  setClosedInSession: (value: boolean) => void;
}

export const useJoinDiscordPromptStore = create<JoinDiscordPromptState>()(
  persist(
    (set) => ({
      dontShowAgain: false satisfies boolean,
      open: false satisfies boolean,
      closedInSession: false satisfies boolean,
      setDontShowAgain: (value: boolean) => set({ dontShowAgain: value }),
      setOpen: (value: boolean) => set({ open: value }),
      setClosedInSession: (value: boolean) => set({ closedInSession: value })
    }),
    {
      name: 'join-discord-prompt-storage'
    }
  )
);
