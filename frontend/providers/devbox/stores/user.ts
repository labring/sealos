import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import { getUserQuota } from '@/api/platform'
import { DevboxEditType } from '@/types/devbox'
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
      checkQuotaAllow: ({ cpu, memory }, usedData): string | undefined => {
        const quote = get().userQuota

        const request = {
          cpu: cpu / 1000,
          memory: memory / 1024
        }

        if (usedData) {
          const { cpu, memory } = usedData
          request.cpu -= cpu / 1000
          request.memory -= memory / 1024
        }

        const overLimitTip: { [key: string]: string } = {
          cpu: 'app.cpu_exceeds_quota',
          memory: 'app.memory_exceeds_quota'
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
