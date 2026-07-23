import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type State = {
  screenWidth: number;
  setScreenWidth: (e: number) => void;
  loading: boolean;
  setLoading: (val: boolean) => void;
  lastRoute: string;
  setLastRoute: (val: string) => void;
};

export const useGlobalStore = create<State>()(
  devtools(
    immer((set, get) => ({
      screenWidth: 1440,
      setScreenWidth(e: number) {
        set((state) => {
          state.screenWidth = e;
        });
      },
      loading: false,
      setLoading(val: boolean) {
        set((state) => {
          state.loading = val;
        });
      },
      lastRoute: '/jobs',
      setLastRoute(val) {
        set((state) => {
          state.lastRoute = val;
        });
      }
    }))
  )
);
