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

        // order by createTime
        res.sort((a, b) => {
          return new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
        })

        set((state) => {
          state.devboxList = res
        })
        return res
      },
      devboxVersionList: [],
      setDevboxVersionList: async (devboxName: string) => {
        const res = await getDevboxVersionList(devboxName)

        // order by createTime
        res.sort((a, b) => {
          return new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
        })

        // createTime：2024/09/11 17:37-> 2024-09-11
        res.forEach((item) => {
          item.createTime = item.createTime.replace(/\d{2}:\d{2}/, '').replace(/\//g, '-')
        })

        set((state) => {
          state.devboxVersionList = res
        })
        return res
      },
      devboxDetail: {} as DevboxDetailType,
      setDevboxDetail: async (devboxName: string) => {
        const res = await getMyDevboxList()

        const detail = res.find((item) => item.name === devboxName) as DevboxDetailType

        // convert startTime to YYYY-MM-DD HH:mm
        detail.createTime = detail.createTime.replace(/\//g, '-')

        // cpu and memory
        detail.cpu = detail.cpu / 1000
        detail.memory = detail.memory / 1024

        set((state) => {
          state.devboxDetail = detail
        })
        return detail
      }
    }))
  )
)
