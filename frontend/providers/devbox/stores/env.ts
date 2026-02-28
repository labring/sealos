import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { getAppEnv } from '@/api/platform';
import { STORAGE_DEFAULT_FALLBACK_GI } from '@/utils/storage';
import { Env } from '@/types/static';

export const defaultEnv: Env = {
  documentUrlZH: 'https://sealos.run/docs/overview/intro',
  documentUrlEN: 'https://sealos.io/docs/overview/intro',
  sealosDomain: 'dev.sealos.plus',
  ingressSecret: 'wildcard-cert',
  registryAddr: 'hub.dev.sealos.plus',
  devboxAffinityEnable: 'true',
  squashEnable: 'false',
  namespace: 'default',
  privacyUrlZH: 'https://sealos.run/docs/msa/privacy-policy',
  privacyUrlEN: 'https://sealos.io/docs/msa/privacy-policy',
  rootRuntimeNamespace: 'devbox-system',
  ingressDomain: 'sealosusw.site',
  currencySymbol: 'shellCoin',
  enableImportFeature: 'false',
  enableWebideFeature: 'false',
  enableAdvancedEnvAndConfigmap: 'false',
  enableAdvancedNfs: 'false',
  enableAdvancedSharedMemory: 'false',
  cpuSlideMarkList: '1,2,4,8,16',
  memorySlideMarkList: '2,4,8,16,32',
  storageDefault: STORAGE_DEFAULT_FALLBACK_GI,
  nfsStorageClassName: 'nfs-csi',
  webIdePort: 9999
};

type State = {
  env: Env;
  setEnv: () => Promise<Env>;
};

export const useEnvStore = create<State>()(
  devtools(
    persist(
      immer((set) => ({
        env: defaultEnv,
        async setEnv() {
          const res = await getAppEnv();
          set((state) => {
            state.env = res;
          });
          return res;
        }
      })),
      {
        name: 'env-storage'
      }
    )
  )
);
