import { getAppConfig } from '@/api/platform';
import {
  AuthClientConfigType,
  CloudConfigType,
  CommonClientConfigType,
  LayoutConfigType,
  TrackingConfigType
} from '@/types';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type State = {
  cloudConfig?: CloudConfigType;
  authConfig?: AuthClientConfigType;
  commonConfig?: CommonClientConfigType;
  layoutConfig?: LayoutConfigType;
  trackingConfig?: TrackingConfigType;
  initAppConfig: () => Promise<void>;
};

export const useConfigStore = create<State>()(
  devtools(
    immer((set, get) => ({
      cloudConfig: undefined,
      authConfig: undefined,
      commonConfig: undefined,
      layoutConfig: undefined,
      trackingConfig: undefined,
      async initAppConfig() {
        const data = await getAppConfig();
        console.log('initAppConfig', data.data);
        set((state) => {
          state.trackingConfig = data.data.tracking;
          state.layoutConfig = data.data.desktop.layout;
          state.authConfig = data.data.desktop.auth;
          state.cloudConfig = data.data.cloud;
          state.commonConfig = data.data.common;
        });
      }
    }))
  )
);
