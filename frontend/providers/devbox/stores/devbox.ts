import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import type {
  DevboxDetailType,
  DevboxListItemType,
  DevboxVersionListItemType,
  PodDetailType
} from '@/types/devbox'
import {
  getDevboxMonitorData,
  getDevboxPodsByDevboxName,
  getDevboxVersionList,
  getMyDevboxList
} from '@/api/devbox'

type State = {
  devboxList: DevboxListItemType[]
  setDevboxList: () => Promise<DevboxListItemType[]>
  devboxVersionList: DevboxVersionListItemType[]
  setDevboxVersionList: (devboxName: string) => Promise<DevboxVersionListItemType[]>
  devboxDetail: DevboxDetailType
  setDevboxDetail: (devboxName: string) => Promise<DevboxDetailType>
  loadDetailMonitorData: (devboxName: string) => Promise<any>
  devboxDetailPods: PodDetailType[]
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

        // isPause
        detail.isPause = detail.status.value === 'Stopped'

        set((state) => {
          state.devboxDetail = detail
        })
        return detail
      },
      devboxDetailPods: [],
      loadDetailMonitorData: async (devboxName) => {
        const pods = await getDevboxPodsByDevboxName(devboxName)
        console.log(pods, 'pods')
        const queryName = pods[0].podName || devboxName

        set((state) => {
          state.devboxDetailPods = pods.map((pod) => {
            const oldPod = state.devboxDetailPods.find((item) => item.podName === pod.podName)
            return {
              ...pod,
              usedCpu: oldPod ? oldPod.usedCpu : pod.usedCpu,
              usedMemory: oldPod ? oldPod.usedMemory : pod.usedMemory
            }
          })
        })

        const [cpuData, memoryData, averageCpuData, averageMemoryData] = await Promise.all([
          getDevboxMonitorData({ queryKey: 'cpu', queryName: queryName, step: '2m' }),
          getDevboxMonitorData({ queryKey: 'memory', queryName: queryName, step: '2m' }),
          getDevboxMonitorData({ queryKey: 'average_cpu', queryName: queryName, step: '2m' }),
          getDevboxMonitorData({ queryKey: 'average_memory', queryName: queryName, step: '2m' })
        ])

        set((state) => {
          if (state?.devboxDetail?.name === devboxName && state.devboxDetail?.isPause !== true) {
            state.devboxDetail.usedCpu = averageCpuData[0]
              ? averageCpuData[0]
              : { xData: new Array(30).fill(0), yData: new Array(30).fill('0'), name: '' }
            state.devboxDetail.usedMemory = averageMemoryData[0]
              ? averageMemoryData[0]
              : { xData: new Array(30).fill(0), yData: new Array(30).fill('0'), name: '' }
          }
          state.devboxDetailPods = pods.map((pod) => {
            const currentCpu = cpuData.find((item) => item.name === pod.podName)
            const currentMemory = memoryData.find((item) => item.name === pod.podName)
            return {
              ...pod,
              usedCpu: currentCpu ? currentCpu : pod.usedCpu,
              usedMemory: currentMemory ? currentMemory : pod.usedMemory
            }
          })
        })
        return 'success'
      }
    }))
  )
)
