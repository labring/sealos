import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type State = {
  isAppBar: boolean;
  toggleShape: () => void;
};

export const useDesktopConfigStore = create<State>()(
  persist(
    immer((set) => ({
      isAppBar: true,
      toggleShape() {
        set((state) => {
          state.isAppBar = !state.isAppBar;
        });
      }
    })),
    {
      name: 'desktop-config'
    }
  )
);
