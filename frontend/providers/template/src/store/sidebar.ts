import { getTemplates } from '@/api/platform';
import { ApplicationType, SideBarMenuType } from '@/types/app';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type State = {
  menuKeys: string;
  sideBarMenu: SideBarMenuType[];
  initMenuKeys: (language?: string) => Promise<void>;
  setSideBarMenu: (data: SideBarMenuType[]) => void;
  setMenuKeys: (menuKeys: string) => void;
};

export const useSidebarStore = create<State>()(
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
      }
    }))
  )
);
