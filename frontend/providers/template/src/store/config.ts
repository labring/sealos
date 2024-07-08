import { getPlatformEnv, getSystemConfig, getTemplates } from '@/api/platform';
import { EnvResponse } from '@/types';
import { ApplicationType, SideBarMenuType, SystemConfigType } from '@/types/app';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type State = {
  envs?: EnvResponse;
  systemConfig: SystemConfigType | undefined;
  menuKeys: string;
  sideBarMenu: SideBarMenuType[];
  initSystemConfig: () => Promise<SystemConfigType>;
  initSystemEnvs: () => Promise<EnvResponse>;
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
      async initSystemEnvs() {
        const envs = await getPlatformEnv();
        set((state) => {
          state.envs = envs;
        });
        return envs;
      },
      setSideBarMenu(data) {
        set((state) => {
          state.sideBarMenu = data;
        });
      }
    }))
  )
);
