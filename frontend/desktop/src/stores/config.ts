import { getSystemConfig } from '@/api/platform';
import { SystemConfigType } from '@/types';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export let BackgroundImageUrl = '/images/bg-blue.svg';
export let ImageFallBackUrl = '/logo.svg';

type State = {
  systemConfig: SystemConfigType | undefined;
  initSystemConfig: () => Promise<SystemConfigType>;
};

export const useSystemConfigStore = create<State>()(
  devtools(
    immer((set, get) => ({
      systemConfig: undefined,
      async initSystemConfig() {
        const data = await getSystemConfig();
        BackgroundImageUrl = data.data?.backgroundImageUrl;
        ImageFallBackUrl = data.data?.imageFallBackUrl;

        set((state) => {
          state.systemConfig = data.data;
        });
        return data.data;
      }
    }))
  )
);
