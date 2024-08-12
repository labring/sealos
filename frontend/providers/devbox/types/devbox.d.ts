import { V1Pod, V1ContainerStatus } from '@kubernetes/client-node'
import { RuntimeEnum, DevboxStatusEnum } from '@/constants/devbox'

export type DevboxStatusValueType = `${DevboxStatusEnum}`
export type RuntimeType = `${RuntimeEnum}`

export interface DevboxEditType {
  devboxName: string
  runtimeType: RuntimeType
  runtimeVersion: string
  cpu: number
  memory: number
}

export interface DevboxStatusMapType {
  label: string
  value: DevboxStatusValueType
  color: string
  backgroundColor: string
  dotColor: string
}

export interface DevboxConditionItemType {
  lastTransitionTime: string
  message: string
  observedGeneration: 3
  reason: string
  status: 'True' | 'False'
  type: string
}

export interface DevboxDetailType extends DevboxEditType {
  id: string
  createTime: string
  status: DevboxStatusMapType
  labels: { [key: string]: string }
}

export interface DevboxListItemType {
  id: string
  name: string
  runtimeType: RuntimeType
  status: DevboxStatusMapType
  createTime: string
  cpu: number
  memory: number
  // TODO: 网络配置方面没补充
  labels: { [key: string]: string }
}

export interface PodDetailType extends V1Pod {
  podName: string
  status: V1ContainerStatus[]
  nodeName: string
  ip: string
  hostIp: string
  restarts: number
  age: string
  cpu: number
  memory: number
}
