import { getAppEnv } from '@/api/platform'
import { Env } from '@/types/static'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

const defaultEnv: Env = {
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
    immer((set, get) => ({
      env: defaultEnv,
      async setEnv() {
        const res = await getAppEnv()
        set((state) => {
          state.env = res
        })
        return res
      }
    }))
  )
)
