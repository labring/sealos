import { getAppEnv } from '@/api/platform';
import { SystemEnvResponse } from '@/pages/api/getEnv';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export let StorageClassName: string | undefined;
export let Domain: string | undefined;

type EnvState = {
  SystemEnv: SystemEnvResponse;
  initSystemEnv: () => void;
};

const useEnvStore = create<EnvState>()(
  immer((set, get) => ({
    SystemEnv: {
      domain: '',
      env_storage_className: '',
      migrate_file_image: '',
      minio_url: ''
    },
    initSystemEnv: async () => {
      try {
        const data = await getAppEnv();
        Domain = data.domain;
        StorageClassName = data.env_storage_className;
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
