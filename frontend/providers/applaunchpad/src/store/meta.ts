import { getInitData } from '@/api/platform';
import { defaultAppConfig } from '@/pages/api/platform/getInitData';
import { AppConfigType } from '@/types';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type State = {
  meta: AppConfigType['launchpad']['meta'];
  initMetaConfig: () => Promise<void>;
};

export const useMetaStore = create<State>()(
  devtools(
    immer((set, get) => ({
      meta: defaultAppConfig.launchpad.meta,
      initMetaConfig: async () => {
        const { META } = await getInitData();
        console.log('metaConfig', META);
        set((state) => {
          state.meta = META;
        });
      }
    }))
  )
);
