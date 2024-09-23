import dayjs from 'dayjs'

import {
  devboxReleaseStatusMap,
  devboxStatusMap,
  podStatusMap,
  PodStatusEnum
} from '@/constants/devbox'
import { calculateUptime, cpuFormatToM, formatPodTime, memoryFormatToMi } from '@/utils/tools'
import { KBDevboxType, KBDevboxReleaseType } from '@/types/k8s'
import { DevboxListItemType, DevboxVersionListItemType, PodDetailType } from '@/types/devbox'
import { V1Pod } from '@kubernetes/client-node'

export const adaptDevboxListItem = (devbox: KBDevboxType): DevboxListItemType => {
  return {
    id: devbox.metadata?.uid || ``,
    name: devbox.metadata.name || 'devbox',
    runtimeType: devbox.spec.runtimeType || '',
    runtimeVersion: devbox.spec.runtimeVersion || '',
    status:
      devbox.status.phase && devboxStatusMap[devbox.status.phase]
        ? devboxStatusMap[devbox.status.phase]
        : devboxStatusMap.Error,
    sshPort: devbox.status.network.nodePort,
    createTime: dayjs(devbox.metadata.creationTimestamp).format('YYYY/MM/DD HH:mm'),
    cpu: cpuFormatToM(devbox.spec.resource.cpu),
    memory: memoryFormatToMi(devbox.spec.resource.memory),
    usedCpu: {
      name: '',
      xData: new Array(30).fill(0),
      yData: new Array(30).fill('0')
    },
    usedMemory: {
      name: '',
      xData: new Array(30).fill(0),
      yData: new Array(30).fill('0')
    },
    networks: devbox.portInfos || [],
    lastTerminatedState: devbox.lastTerminatedState || {}
  }
}

export const adaptDevboxVersionListItem = (
  devboxRelease: KBDevboxReleaseType
): DevboxVersionListItemType => {
  return {
    id: devboxRelease.metadata?.uid || '',
    name: devboxRelease.metadata.name || 'devbox-release-default',
    devboxName: devboxRelease.spec.devboxName || 'devbox',
    createTime: dayjs(devboxRelease.metadata.creationTimestamp).format('YYYY/MM/DD HH:mm'),
    tag: devboxRelease.spec.newTag || 'v1.0.0',
    status:
      devboxRelease.status.phase && devboxReleaseStatusMap[devboxRelease.status.phase]
        ? devboxReleaseStatusMap[devboxRelease.status.phase]
        : devboxReleaseStatusMap.Failed,
    description: devboxRelease.spec.notes || 'release notes'
  }
}

export const adaptPod = (pod: V1Pod): PodDetailType => {
  return {
    ...pod,
    podName: pod.metadata?.name || 'pod name',
    upTime: calculateUptime(pod.metadata?.creationTimestamp || new Date()),
    status: (() => {
      const container = pod.status?.containerStatuses || []
      if (container.length > 0) {
        const stateObj = container[0].state
        if (stateObj) {
          const stateKeys = Object.keys(stateObj)
          const key = stateKeys[0] as `${PodStatusEnum}`
          if (key === PodStatusEnum.running) {
            return podStatusMap[PodStatusEnum.running]
          }
          if (key && podStatusMap[key]) {
            return {
              ...podStatusMap[key],
              ...stateObj[key]
            }
          }
        }
      }
      return podStatusMap.waiting
    })(),
    containerStatus: (() => {
      const container = pod.status?.containerStatuses || []
      if (container.length > 0) {
        const lastStateObj = container[0].lastState
        if (lastStateObj) {
          const lastStateKeys = Object.keys(lastStateObj)
          const key = lastStateKeys[0] as `${PodStatusEnum}`
          if (key && podStatusMap[key]) {
            return {
              ...podStatusMap[key],
              ...lastStateObj[key]
            }
          }
        }
      }
      return podStatusMap.waiting
    })(),
    nodeName: pod.spec?.nodeName || 'node name',
    ip: pod.status?.podIP || 'pod ip',
    restarts: pod.status?.containerStatuses ? pod.status?.containerStatuses[0].restartCount : 0,
    age: formatPodTime(pod.metadata?.creationTimestamp),
    usedCpu: {
      name: '',
      xData: new Array(30).fill(0),
      yData: new Array(30).fill('0')
    },
    usedMemory: {
      name: '',
      xData: new Array(30).fill(0),
      yData: new Array(30).fill('0')
    },
    cpu: cpuFormatToM(pod.spec?.containers?.[0]?.resources?.limits?.cpu || '0'),
    memory: memoryFormatToMi(pod.spec?.containers?.[0]?.resources?.limits?.memory || '0')
  }
}
