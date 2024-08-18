import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import { getDevboxVersionList, getMyDevboxList } from '@/api/devbox'
import type { DevboxListItemType, DevboxVersionListItemType } from '@/types/devbox'

type State = {
  devboxList: DevboxListItemType[]
  setDevboxList: () => Promise<DevboxListItemType[]>
  devboxVersionList: DevboxVersionListItemType[]
  setDevboxVersionList: (devboxName: string) => Promise<DevboxVersionListItemType[]>
  // devboxDetail: DevboxDetailType
  // loadDevboxDetail: (name: string, isFetchConfigMap?: boolean) => Promise<DevboxDetailType>
  // devboxPods: PodDetailType[]
  // intervalLoadPods: (dbName: string) => Promise<null>
}

export const useDevboxStore = create<State>()(
  devtools(
    immer((set) => ({
      devboxList: [],
      setDevboxList: async () => {
        const res = await getMyDevboxList()

        set((state) => {
          state.devboxList = res
        })
        return res
      },
      devboxVersionList: [],
      setDevboxVersionList: async (devboxName: string) => {
        const res = await getDevboxVersionList(devboxName)

        set((state) => {
          state.devboxVersionList = res
        })
        return res
      }
    }))
  )
)
