import { V1Pod, V1ContainerStatus } from '@kubernetes/client-node'

import {
  RuntimeTypeEnum,
  DevboxStatusEnum,
  FrameworkTypeEnum,
  YamlKindEnum
} from '@/constants/devbox'
import { MonitorDataResult } from './monitor'

export type DevboxStatusValueType = `${DevboxStatusEnum}`
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
  startTime: string
  status: DevboxStatusMapType
  usedCpu: MonitorDataResult
  usedMemory: MonitorDataResult
  sshPort: number
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

export interface DevboxVersionListItemType {
  id: string
  name: string
  devboxName: string
  tag: string
  createTime: string
  description: string
  status: DevboxStatusMapType
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

export interface valueType {
  id: string
  label: string
}

export interface VersionMapType {
  [key: string]: valueType[]
}

export interface runtimeNamespaceMapType {
  [key: string]: string
}
