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
      desktopDomain: '',
      domain: '',
      env_storage_className: '',
      migrate_file_image: '',
      minio_url: '',
      BACKUP_ENABLED: false,
      SHOW_DOCUMENT: true,
      CurrencySymbol: 'shellCoin',
      STORAGE_MAX_SIZE: 300,
      CLIENT_DOMAIN_NAME: '',
      GATEWAY_DOMAIN_NAME: '',
      MANAGED_DB_ENABLED: '',
      CHAT2DB_AES_KEY: '',
      MIGRATION_JOB_CPU_REQUIREMENT: 2000,
      MIGRATION_JOB_MEMORY_REQUIREMENT: 4096,
      DUMPIMPORT_JOB_CPU_REQUIREMENT: 300,
      DUMPIMPORT_JOB_MEMORY_REQUIREMENT: 256,
      BACKUP_JOB_CPU_REQUIREMENT: 300,
      BACKUP_JOB_MEMORY_REQUIREMENT: 256
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
