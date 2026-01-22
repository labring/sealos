import { getPlatformEnv, getTemplates } from '@/api/platform';
import { EnvResponse } from '@/types';
import { ApplicationType, SideBarMenuType } from '@/types/app';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type State = {
  envs?: EnvResponse;
  menuKeys: string;
  sideBarMenu: SideBarMenuType[];
  initSystemEnvs: () => Promise<EnvResponse>;
  initMenuKeys: (language?: string) => Promise<void>;
  setSideBarMenu: (data: SideBarMenuType[]) => void;
  setMenuKeys: (menuKeys: string) => void;
  setEnvs: (data: EnvResponse) => void;
};

export const useSystemConfigStore = create<State>()(
  devtools(
    immer((set, get) => ({
      menuKeys: '',
      sideBarMenu: [
        {
          id: 'applications',
          type: ApplicationType.All,
          value: 'SideBar.Applications'
        }
      ],
      async initSystemEnvs() {
        const envs = await getPlatformEnv();
        set((state) => {
          state.envs = envs;
        });
        return envs;
      },
      async initMenuKeys(language?: string) {
        try {
          const { menuKeys: newMenuKeys } = await getTemplates(language);

          if (get().menuKeys !== newMenuKeys) {
            const menus = newMenuKeys.split(',').map((i) => ({
              id: i,
              type: i as ApplicationType,
              value: `SideBar.${i}`
            }));
            set((state) => {
              state.menuKeys = newMenuKeys;
              state.sideBarMenu = [
                {
                  id: 'applications',
                  type: ApplicationType.All,
                  value: 'SideBar.Applications'
                },
                ...menus
              ];
            });
          }
        } catch (error) {
          console.error('[System Config] Failed to init menu keys:', error);
        }
      },
      setSideBarMenu(data) {
        set((state) => {
          state.sideBarMenu = data;
        });
      },
      setMenuKeys(menuKeys) {
        set((state) => {
          state.menuKeys = menuKeys;
        });
      },
      setEnvs(data) {
        set((state) => {
          state.envs = data;
        });
      }
    }))
  )
);
