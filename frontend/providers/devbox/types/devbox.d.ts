import {
  V1Pod,
  V1ContainerStatus,
  V1Deployment,
  V1ConfigMap,
  V1Service,
  V1Ingress,
  V1Secret,
  V1HorizontalPodAutoscaler,
  SinglePodMetrics,
  V1StatefulSet
} from '@kubernetes/client-node'

import {
  RuntimeTypeEnum,
  DevboxStatusEnum,
  DevboxReleaseStatusEnum,
  FrameworkTypeEnum,
  YamlKindEnum,
  LanguageTypeEnum,
  OSTypeEnum,
  PodStatusEnum
} from '@/constants/devbox'
import { MonitorDataResult } from './monitor'

export type DevboxStatusValueType = `${DevboxStatusEnum}`
export type DevboxReleaseStatusValueType = `${DevboxReleaseStatusEnum}`
export type RuntimeType = `${FrameworkTypeEnum}` | `${LanguageTypeEnum}` | `${OSTypeEnum}`
export type ProtocolType = 'HTTP' | 'GRPC' | 'WS'

export interface DevboxEditType {
  name: string
  runtimeType: string
  runtimeVersion: string
  cpu: number
  memory: number
  networks: {
    networkName: string
    portName: string
    port: number
    protocol: ProtocolType
    openPublicDomain: boolean
    publicDomain: string // default domain
    customDomain: string // custom domain
  }[]
}

export interface DevboxStatusMapType {
  label: string
  value: DevboxStatusValueType
  color: string
  backgroundColor: string
  dotColor: string
}
export interface DevboxReleaseStatusMapType {
  label: string
  value: DevboxReleaseStatusValueType
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
  upTime?: string
  createTime: string
  isPause?: boolean
  status: DevboxStatusMapType
  usedCpu: MonitorDataResult
  usedMemory: MonitorDataResult
  sshConfig?: {
    sshUser: string
    sshDomain: string
    sshPort: number
    sshPrivateKey: string
  }
  sshPort?: number
  lastTerminatedState?: {
    containerID: string
    exitCode: number
    finishedAt: string
    reason: string
    startedAt: string
  }
}

export interface NetworkType {
  networkName: string
  portName: string
  port: number
  protocol: ProtocolType
  openPublicDomain: boolean
  publicDomain: string // default domain
  customDomain: string // custom domain
}

export interface DevboxListItemType {
  id: string
  name: string
  runtimeType: string
  runtimeVersion: string
  status: DevboxStatusMapType
  createTime: string
  cpu: number
  memory: number
  usedCpu: MonitorDataResult
  usedMemory: MonitorDataResult
  networks: NetworkType[]
  sshPort: number
  lastTerminatedState?: {
    containerID: string
    exitCode: number
    finishedAt: string
    reason: string
    startedAt: string
  }
}

export interface DevboxVersionListItemType {
  id: string
  name: string
  devboxName: string
  tag: string
  createTime: string
  description: string
  status: DevboxReleaseStatusMapType
}

export type DevboxPatchPropsType = (
  | { type: 'delete'; kind: `${YamlKindEnum}`; name: string }
  | { type: 'patch'; kind: `${YamlKindEnum}`; value: Record<string, any> }
  | { type: 'create'; kind: `${YamlKindEnum}`; value: string }
)[]

export type DevboxKindsType =
  | V1Deployment
  | V1StatefulSet
  | V1ConfigMap
  | V1Service
  | V1Ingress
  | V1Secret
  | V1HorizontalPodAutoscaler

export interface ValueType {
  id: string
  label: string
}

export interface VersionMapType {
  [key: string]: ValueTypeWithPorts[]
}

export interface ValueTypeWithPorts extends ValueType {
  defaultPorts: number[]
}

export interface runtimeNamespaceMapType {
  [key: string]: string
}

export interface PodStatusMapType {
  label: string
  value: `${PodStatusEnum}`
  color: string
  reason?: string
  message?: string
}

export interface PodDetailType extends V1Pod {
  podName: string
  upTime: string
  status: PodStatusMapType
  nodeName: string
  ip: string
  restarts: number
  age: string
  usedCpu: MonitorDataResult
  usedMemory: MonitorDataResult
  cpu: number
  memory: number
  podReason?: string
  podMessage?: string
  containerStatus: PodStatusMapType
}
