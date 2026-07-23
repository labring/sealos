import { create } from 'zustand';

type State = {
  screenWidth: number;
  setScreenWidth: (e: number) => void;
  lastRoute: string;
  setLastRoute: (val: string) => void;
};

export const useGlobalStore = create<State>()((set) => ({
  screenWidth: 1440,
  setScreenWidth: (e) => set({ screenWidth: e }),
  lastRoute: '/',
  setLastRoute: (val) => set({ lastRoute: val })
}));
