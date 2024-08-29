import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import type {
  DevboxDetailType,
  DevboxListItemType,
  DevboxVersionListItemType
} from '@/types/devbox'
import { getDevboxVersionList, getMyDevboxList } from '@/api/devbox'

type State = {
  devboxList: DevboxListItemType[]
  setDevboxList: () => Promise<DevboxListItemType[]>
  devboxVersionList: DevboxVersionListItemType[]
  setDevboxVersionList: (devboxName: string) => Promise<DevboxVersionListItemType[]>
  devboxDetail: DevboxDetailType
  setDevboxDetail: (devboxName: string) => Promise<DevboxDetailType>
}

export const useDevboxStore = create<State>()(
  devtools(
    immer((set) => ({
      devboxList: [],
      setDevboxList: async () => {
        const res = await getMyDevboxList()

        console.log('devboxList', res)

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
      },
      devboxDetail: {} as DevboxDetailType,
      setDevboxDetail: async (devboxName: string) => {
        const res = await getMyDevboxList()

        const detail = res.find((item) => item.name === devboxName) as DevboxDetailType

        console.log(detail)

        set((state) => {
          state.devboxDetail = detail
        })
        return detail
      }
    }))
  )
)
