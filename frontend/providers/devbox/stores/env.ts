import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { devtools, persist } from 'zustand/middleware'

import { Env } from '@/types/static'
import { getAppEnv } from '@/api/platform'

export const defaultEnv: Env = {
  sealosDomain: 'dev.sealos.plus',
  ingressSecret: 'wildcard-cert',
  registryAddr: 'hub.dev.sealos.plus',
  devboxAffinityEnable: 'true',
  squashEnable: 'false',
  namespace: 'default',
  rootRuntimeNamespace: 'devbox-system',
  ingressDomain: 'sealosusw.site'
}

type State = {
  env: Env
  setEnv: () => Promise<Env>
}

export const useEnvStore = create<State>()(
  devtools(
    persist(
      immer((set) => ({
        env: defaultEnv,
        async setEnv() {
          const res = await getAppEnv()
          set((state) => {
            state.env = res
          })
          return res
        }
      })),
      {
        name: 'env-storage'
      }
    )
  )
)
