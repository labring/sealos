import { getSystemConfig } from '@/api/platform';
import { ApplicationType, SideBarMenuType, SystemConfigType } from '@/types/app';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type State = {
  systemConfig: SystemConfigType | undefined;
  sideBarMenu: SideBarMenuType[];
  menuKeys: string;
  initSystemConfig: () => Promise<SystemConfigType>;
  setSideBarMenu: (newMenu: SideBarMenuType[]) => void;
  setMenuKeys: (key: string) => void;
};

export const baseSideBarMenu: SideBarMenuType[] = [
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
      setSideBarMenu(newMenu: SideBarMenuType[]) {
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
