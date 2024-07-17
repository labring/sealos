import { getAppEnv } from '@/api/platform';
import { SystemEnvResponse } from '@/pages/api/getEnv';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export let StorageClassName: string | undefined;
export let Domain: string | undefined;

type EnvState = {
  SystemEnv: SystemEnvResponse;
  initSystemEnv: () => Promise<SystemEnvResponse>;
};

const useEnvStore = create<EnvState>()(
  immer((set, get) => ({
    SystemEnv: {
      domain: '',
      env_storage_className: '',
      migrate_file_image: '',
      minio_url: '',
      BACKUP_ENABLED: false,
      SHOW_DOCUMENT: true
    },
    initSystemEnv: async () => {
      const data = await getAppEnv();
      Domain = data.domain;
      StorageClassName = data.env_storage_className;
      set((state) => {
        state.SystemEnv = data;
      });
      return data;
    }
  }))
);

export default useEnvStore;
