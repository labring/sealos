import {
  AppConfigType,
  AuthConfigType,
  CloudConfigType,
  CommonConfigType,
  LayoutConfigType
} from '@/types';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { getAppConfig } from '@/api/platform';

type State = {
  commonConfig: CommonConfigType | undefined;
  authConfig: AuthConfigType | undefined;
  cloudConfig: CloudConfigType | undefined;
  layoutConfig: LayoutConfigType | undefined;
  initAppConfig: () => Promise<AppConfigType | undefined>;
};

export const useConfigStore = create<State>()(
  devtools(
    immer((set, get) => ({
      cloudConfig: undefined,
      authConfig: undefined,
      commonConfig: undefined,
      layoutConfig: undefined,

      async initAppConfig() {
        const data = await getAppConfig();

        console.log('initAppConfig', data.data);

        set((state) => {
          state.layoutConfig = data.data.desktop.layout;
          state.authConfig = data.data.desktop.auth;
          state.cloudConfig = data.data.cloud;
          state.commonConfig = data.data.common;
        });
        return data.data;
      }
    }))
  )
);
