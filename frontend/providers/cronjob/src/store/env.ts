import { getPlatformEnv } from '@/api/platform';
import { EnvResponse } from '@/pages/api/platform/getEnv';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

type EnvState = {
  SystemEnv: EnvResponse;
  initSystemEnv: () => void;
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
      } catch (error) {
        console.log(error, 'get system env');
      }
    }
  }))
);

export default useEnvStore;
