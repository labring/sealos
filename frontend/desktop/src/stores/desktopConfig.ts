import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type State = {
  isAppBar: boolean;
  isNavbarVisible: boolean;
  toggleShape: () => void;
  toggleNavbarVisibility: () => void;
};

export const useDesktopConfigStore = create<State>()(
  persist(
    immer((set) => ({
      isAppBar: true,
      isNavbarVisible: true,
      toggleShape() {
        set((state) => {
          state.isAppBar = !state.isAppBar;
        });
      },
      toggleNavbarVisibility() {
        set((state) => {
          state.isNavbarVisible = !state.isNavbarVisible;
        });
      }
    })),
    {
      name: 'desktop-config'
    }
  )
);
