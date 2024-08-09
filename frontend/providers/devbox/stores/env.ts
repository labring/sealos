import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { getAppEnv } from '@/api/platform'
import { SystemEnvResponse } from '@/app/api/getEnv/route'

type EnvState = {
  systemEnv: SystemEnvResponse
  initSystemEnv: () => Promise<SystemEnvResponse>
}

export const useEnvStore = create<EnvState>()(
  immer((set) => ({
    systemEnv: {
      domain: ''
    },
    initSystemEnv: async () => {
      const data = await getAppEnv()
      set({ systemEnv: data })
      return data
    }
  }))
)
