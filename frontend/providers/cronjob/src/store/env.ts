import { getPlatformEnv } from '@/api/platform';
import { defaultDomain } from '@/constants/keys';
import { EnvResponse } from '@/pages/api/platform/getEnv';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

type EnvState = {
  SystemEnv: EnvResponse;
  initSystemEnv: () => Promise<EnvResponse>;
};

const useEnvStore = create<EnvState>()(
  immer((set, get) => ({
    SystemEnv: {
      domain: ''
    },
    initSystemEnv: async () => {
      try {
        const data = await getPlatformEnv();
        set((state) => {
          state.SystemEnv = data;
        });
        return data;
      } catch (error) {
        return {
          domain: defaultDomain
        };
      }
    }
  }))
);

export default useEnvStore;
