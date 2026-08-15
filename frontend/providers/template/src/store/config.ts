import { getPlatformEnv, getSystemConfig, getTemplates } from '@/api/platform';
import { EnvResponse } from '@/types';
import { ApplicationType, SideBarMenuType, SystemConfigType } from '@/types/app';
import type { TemplateCategory } from '@/types/config';
import { getCategoryLabel } from '@/utils/template';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type State = {
  envs?: EnvResponse;
  systemConfig: SystemConfigType | undefined;
  menuKeys: string;
  sideBarMenu: SideBarMenuType[];
  initSystemConfig: (language?: string) => Promise<SystemConfigType>;
  initSystemEnvs: () => Promise<EnvResponse>;
  setSideBarMenu: (data: SideBarMenuType[]) => void;
  setEnvs: (data: EnvResponse) => void;
};

export function shouldResetAppType(
  appType: ApplicationType,
  categories: readonly TemplateCategory[]
) {
  if (appType === ApplicationType.All || appType === ApplicationType.MyApp) {
    return false;
  }

  return !categories.some((category) => category.slug === appType);
}

export function buildSideBarMenu(
  categories: TemplateCategory[] | undefined,
  menuKeys: string,
  language?: string
): SideBarMenuType[] {
  const menus =
    categories?.map((category) => ({
      id: category.slug,
      type: category.slug as ApplicationType,
      value: getCategoryLabel(category, language)
    })) ??
    menuKeys.split(',').map((i) => ({
      id: i,
      type: i as ApplicationType,
      value: `SideBar.${i}`
    }));

  return [
    {
      id: 'applications',
      type: ApplicationType.All,
      value: 'SideBar.Applications'
    },
    ...menus
  ];
}

export const useSystemConfigStore = create<State>()(
  devtools(
    immer((set) => ({
      systemConfig: undefined,
      menuKeys: '',
      sideBarMenu: [
        {
          id: 'applications',
          type: ApplicationType.All,
          value: 'SideBar.Applications'
        }
      ],
      async initSystemConfig(language?: string) {
        const data = await getSystemConfig();
        const { menuKeys, categories } = await getTemplates(language);

        set((state) => {
          state.menuKeys = menuKeys;
          state.sideBarMenu = buildSideBarMenu(categories, menuKeys, language);
        });
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
      },
      setEnvs(data) {
        set((state) => {
          state.envs = data;
        });
      }
    }))
  )
);
