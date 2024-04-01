import { getSystemConfig, getTemplates } from '@/api/platform';
import { ApplicationType, SideBarMenuType, SystemConfigType } from '@/types/app';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type State = {
  systemConfig: SystemConfigType | undefined;
  menuKeys: string;
  sideBarMenu: SideBarMenuType[];
  initSystemConfig: () => Promise<SystemConfigType>;
  setSideBarMenu: (data: SideBarMenuType[]) => void;
};

export const useSystemConfigStore = create<State>()(
  devtools(
    immer((set, get) => ({
      systemConfig: undefined,
      menuKeys: '',
      sideBarMenu: [
        {
          id: 'applications',
          type: ApplicationType.All,
          value: 'SideBar.Applications'
        }
      ],
      async initSystemConfig() {
        const data = await getSystemConfig();
        const { menuKeys } = await getTemplates();

        if (get().menuKeys !== menuKeys) {
          const menus = menuKeys.split(',').map((i) => ({
            id: i,
            type: i as ApplicationType,
            value: `SideBar.${i}`
          }));
          set((state) => {
            state.menuKeys = menuKeys;
            state.sideBarMenu = get().sideBarMenu.concat(menus);
          });
        }

        set((state) => {
          state.systemConfig = data;
        });
        return data;
      },
      setSideBarMenu(data) {
        set((state) => {
          state.sideBarMenu = data;
        });
      }
    }))
  )
);
