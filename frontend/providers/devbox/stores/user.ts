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
      checkQuotaAllow: ({ cpu, memory, networks }, usedData): string | undefined => {
        const quote = get().userQuota

        const nodeports = networks.reduce((count, network) => {
          return network.openPublicDomain ? count + 1 : count
        }, 0)

        const request = {
          cpu: cpu / 1000,
          memory: memory / 1024,
          nodeports: nodeports
        }

        if (usedData) {
          const { cpu, memory, networks } = usedData
          const usedNodeports = networks.reduce((count, network) => {
            return network.openPublicDomain ? count + 1 : count
          }, 0)

          request.cpu -= cpu / 1000
          request.memory -= memory / 1024
          request.nodeports -= usedNodeports
        }

        const overLimitTip: { [key: string]: string } = {
          cpu: 'cpu_exceeds_quota',
          memory: 'memory_exceeds_quota',
          nodeports: 'nodeports_exceeds_quota'
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
