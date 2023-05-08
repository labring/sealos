import request from '@/services/request';
import { TOSState, TApp, initialFrantState, APPTYPE, Pid } from '@/types';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type DesktopGlobalConfig = {
  isHideStartMenu: boolean;
  desktopHeight: number;
  toggleStartMenu(): void;
  setDesktopHeight(height: number): void;
};

const useDesktopGlobalConfig = create<DesktopGlobalConfig>()(
  immer<DesktopGlobalConfig>((set, get) => ({
    isHideStartMenu: true,
    desktopHeight: 0,
    toggleStartMenu: () => {
      set((state) => {
        state.isHideStartMenu = !state.isHideStartMenu;
      });
    },
    setDesktopHeight(height: number) {
      set((state) => {
        state.desktopHeight = height;
      });
    }
  }))
);
export default useDesktopGlobalConfig;
