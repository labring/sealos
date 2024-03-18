import { getSystemConfig, getTemplates } from '@/api/platform';
import { ApplicationType, SideBarMenuType, SystemConfigType } from '@/types/app';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type State = {
  systemConfig: SystemConfigType | undefined;
  initSystemConfig: () => Promise<SystemConfigType>;
};

export let SideBarMenu = [
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
      async initSystemConfig() {
        const data = await getSystemConfig();

        const { menuKeys } = await getTemplates();
        const menus = SideBarMenu.concat(
          menuKeys.split(',').map((i) => ({
            id: i,
            type: i as ApplicationType,
            value: `SideBar.${i}`
          }))
        );
        SideBarMenu = menus;

        set((state) => {
          state.systemConfig = data;
        });
        return data;
      }
    }))
  )
);
