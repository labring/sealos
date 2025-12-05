import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { getAppEnv } from '@/api/platform';
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
  enableImportFeature: 'false'
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
