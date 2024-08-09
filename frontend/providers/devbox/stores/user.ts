import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import { DevboxEditType } from '@/types/devbox'
import { getUserQuota } from '@/api/platform'
import { UserQuotaItemType } from '@/types/user'

type State = {
  balance: number
  userQuota: UserQuotaItemType[]
  loadUserQuota: () => Promise<null>
  checkQuotaAllow: (request: DevboxEditType, usedData?: DevboxEditType) => string | undefined
}

export const useUserStore = create<State>()(
  devtools(
    immer((set, get) => ({
      balance: 5,
      userQuota: [],
      loadUserQuota: async () => {
        const response = await getUserQuota()

        set((state) => {
          state.userQuota = response.quota
        })
        return null
      },
      checkQuotaAllow: ({ cpu, memory, storage, replicas }, usedData): string | undefined => {
        const quote = get().userQuota

        const request = {
          cpu: (cpu / 1000) * replicas,
          memory: (memory / 1024) * replicas,
          storage: storage * replicas
        }

        if (usedData) {
          const { cpu, memory, storage, replicas } = usedData
          request.cpu -= (cpu / 1000) * replicas
          request.memory -= (memory / 1024) * replicas
          request.storage -= storage * replicas
        }

        const overLimitTip: { [key: string]: string } = {
          cpu: 'app.cpu_exceeds_quota',
          memory: 'app.memory_exceeds_quota',
          storage: 'app.storage_exceeds_quota'
        }

        const exceedQuota = quote.find((item) => {
          if (item.used + request[item.type] > item.limit) {
            return true
          }
        })

        return exceedQuota?.type ? overLimitTip[exceedQuota.type] : undefined
      }
    }))
  )
)
