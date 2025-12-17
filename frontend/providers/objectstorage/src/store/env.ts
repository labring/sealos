import { getEnv } from '@/api/bucket';
import { EnvResponse } from '@/pages/api/env';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export let StorageClassName: string | undefined;
export let Domain: string | undefined;

type EnvState = {
  SystemEnv: EnvResponse;
  initSystemEnv: () => Promise<EnvResponse>;
};

const useEnvStore = create<EnvState>()(
  immer((set, get) => ({
    SystemEnv: {
      HOSTING_POD_CPU_REQUIREMENT: 200,
      HOSTING_POD_MEMORY_REQUIREMENT: 128
    },
    initSystemEnv: async () => {
      const data = await getEnv();

      set((state) => {
        state.SystemEnv = data;
      });
      return data;
    }
  }))
);

export default useEnvStore;
