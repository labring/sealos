import dayjs from 'dayjs'

import {
  devboxReleaseStatusMap,
  devboxStatusMap,
  podStatusMap,
  PodStatusEnum
} from '@/constants/devbox'
import { calculateUptime, cpuFormatToM, formatPodTime, memoryFormatToMi } from '@/utils/tools'
import { KBDevboxType, KBDevboxReleaseType } from '@/types/k8s'
import {
  DevboxDetailType,
  DevboxListItemType,
  DevboxVersionListItemType,
  PodDetailType
} from '@/types/devbox'
import { V1Ingress, V1Pod } from '@kubernetes/client-node'
import { DBListItemType, KbPgClusterType } from '@/types/cluster'
import { IngressListItemType } from '@/types/ingress'

export const adaptDevboxListItem = (devbox: KBDevboxType): DevboxListItemType => {
  return {
    id: devbox.metadata?.uid || ``,
    name: devbox.metadata.name || 'devbox',
    runtimeType: devbox.spec.runtimeType || '',
    runtimeVersion: devbox.spec.runtimeRef.name || '',
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
    lastTerminatedReason:
      devbox.status.lastState?.terminated && devbox.status.lastState.terminated.reason === 'Error'
        ? devbox.status.state.waiting
          ? devbox.status.state.waiting.reason
          : devbox.status.state.terminated
          ? devbox.status.state.terminated.reason
          : ''
        : ''
  }
}

export const adaptDevboxDetail = (
  devbox: KBDevboxType & { portInfos: any[] }
): DevboxDetailType => {
  return {
    id: devbox.metadata?.uid || ``,
    name: devbox.metadata.name || 'devbox',
    runtimeType: devbox.spec.runtimeType || '',
    runtimeVersion: devbox.spec.runtimeRef.name || '',
    status:
      devbox.status.phase && devboxStatusMap[devbox.status.phase]
        ? devboxStatusMap[devbox.status.phase]
        : devboxStatusMap.Error,
    sshPort: devbox.status.network.nodePort,
    isPause: devbox.status.phase === 'Stopped',
    createTime: dayjs(devbox.metadata.creationTimestamp).format('YYYY-MM-DD HH:mm'),
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
    lastTerminatedReason:
      devbox.status.lastState?.terminated && devbox.status.lastState.terminated.reason === 'Error'
        ? devbox.status.state.waiting
          ? devbox.status.state.waiting.reason
          : devbox.status.state.terminated
          ? devbox.status.state.terminated.reason
          : ''
        : ''
  }
}
export const adaptDevboxVersionListItem = (
  devboxRelease: KBDevboxReleaseType
): DevboxVersionListItemType => {
  return {
    id: devboxRelease.metadata?.uid || '',
    name: devboxRelease.metadata.name || 'devbox-release-default',
    devboxName: devboxRelease.spec.devboxName || 'devbox',
    createTime: dayjs(devboxRelease.metadata.creationTimestamp).format('YYYY-MM-DD HH:mm'),
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

export const adaptDBListItem = (db: KbPgClusterType): DBListItemType => {
  return {
    id: db.metadata?.uid || ``,
    name: db.metadata?.name || 'db name',
    dbType: db?.metadata?.labels['clusterdefinition.kubeblocks.io/name'] || 'postgresql',
    createTime: dayjs(db.metadata?.creationTimestamp).format('YYYY/MM/DD HH:mm'),
    cpu: cpuFormatToM(db.spec?.componentSpecs?.[0]?.resources?.limits?.cpu),
    memory: cpuFormatToM(db.spec?.componentSpecs?.[0]?.resources?.limits?.memory),
    storage:
      db.spec?.componentSpecs?.[0]?.volumeClaimTemplates?.[0]?.spec?.resources?.requests?.storage ||
      '-'
  }
}

export const adaptIngressListItem = (ingress: V1Ingress): IngressListItemType => {
  const firstRule = ingress.spec?.rules?.[0]
  const firstPath = firstRule?.http?.paths?.[0]

  return {
    name: ingress.metadata?.name || '',
    namespace: ingress.metadata?.namespace || '',
    host: firstRule?.host || '',
    port: firstPath?.backend?.service?.port?.number || 0
  }
}
