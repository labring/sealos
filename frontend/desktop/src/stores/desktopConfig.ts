import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type TaskComponentState = 'none' | 'modal' | 'button';

type State = {
  isAppBar: boolean;
  isNavbarVisible: boolean;
  isAnimationEnabled: boolean;
  toggleShape: () => void;
  toggleNavbarVisibility: (forceState?: boolean) => void;
  temporarilyDisableAnimation: () => void;
  getTransitionValue: () => string;
  taskComponentState: TaskComponentState;
  setTaskComponentState: (state: TaskComponentState) => void;
};

export const useDesktopConfigStore = create<State>()(
  persist(
    immer((set, get) => ({
      isAppBar: true,
      isNavbarVisible: true,
      isAnimationEnabled: true,
      taskComponentState: 'none',
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
      },
      setTaskComponentState(s) {
        set((state) => {
          state.taskComponentState = s;
        });
      }
    })),
    {
      name: 'desktop-config'
    }
  )
);
