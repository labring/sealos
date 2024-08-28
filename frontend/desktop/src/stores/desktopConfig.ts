import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type State = {
  isAppBar: boolean;
  isNavbarVisible: boolean;
  isAnimationEnabled: boolean;
  toggleShape: () => void;
  toggleNavbarVisibility: (forceState?: boolean) => void;
  temporarilyDisableAnimation: () => void;
  getTransitionValue: () => string;
};

export const useDesktopConfigStore = create<State>()(
  persist(
    immer((set, get) => ({
      isAppBar: true,
      isNavbarVisible: true,
      isAnimationEnabled: true,
      toggleShape() {
        set((state) => {
          state.isAppBar = !state.isAppBar;
        });
      },
      toggleNavbarVisibility(forceState) {
        set((state) => {
          state.isNavbarVisible = forceState !== undefined ? forceState : !state.isNavbarVisible;
        });
      },
      temporarilyDisableAnimation() {
        set((state) => {
          state.isAnimationEnabled = false;
        });
        requestAnimationFrame(() => {
          set((state) => {
            state.isAnimationEnabled = true;
          });
        });
      },
      getTransitionValue() {
        return get().isAnimationEnabled
          ? 'transform 200ms ease-in-out, opacity 200ms ease-in-out'
          : 'none';
      }
    })),
    {
      name: 'desktop-config'
    }
  )
);
