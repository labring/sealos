import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import { getMyDevboxList } from '@/api/devbox'
import type { DevboxListItemType } from '@/types/devbox'

type State = {
  devboxList: DevboxListItemType[]
  setDevboxList: () => Promise<DevboxListItemType[]>
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
        console.log(res)

        set((state) => {
          state.devboxList = res
        })
        return res
      }
    }))
  )
)
