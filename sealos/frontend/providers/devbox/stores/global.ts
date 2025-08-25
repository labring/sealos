import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export type IDEType =
  | 'vscode'
  | 'cursor'
  | 'vscodeInsiders'
  | 'windsurf'
  | 'trae'
  | 'traeCN'
  | 'gateway'
  | 'toolbox';

type State = {
  screenWidth: number;
  setScreenWidth: (e: number) => void;
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
      lastRoute: '/',
      setLastRoute(val) {
        set((state) => {
          state.lastRoute = val;
        });
      }
    }))
  )
);
