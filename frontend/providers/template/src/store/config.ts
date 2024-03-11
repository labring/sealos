import { getSystemConfig } from '@/api/platform';
import { ApplicationType, SideBarMenu, SystemConfigType } from '@/types/app';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type State = {
  systemConfig: SystemConfigType | undefined;
  sideBarMenu: SideBarMenu[];
  menuKeys: string;
  initSystemConfig: () => Promise<SystemConfigType>;
  setSideBarMenu: (newMenu: SideBarMenu[]) => void;
  setMenuKeys: (key: string) => void;
};

export const baseSideBarMenu = [
  {
    id: 'applications',
    type: ApplicationType.All,
    value: 'SideBar.Applications'
  }
];

export const useSystemConfigStore = create<State>()(
  devtools(
    immer((set, get) => ({
      systemConfig: undefined,
      menuKeys: '',
      sideBarMenu: baseSideBarMenu,
      async initSystemConfig() {
        const data = await getSystemConfig();
        set((state) => {
          state.systemConfig = data;
        });
        return data;
      },
      setSideBarMenu(newMenu: SideBarMenu[]) {
        set((state) => {
          state.sideBarMenu = newMenu;
        });
      },
      setMenuKeys(key: string) {
        set((state) => {
          state.menuKeys = key;
        });
      }
    }))
  )
);
