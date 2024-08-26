import { DevboxStatusEnum, PodStatusEnum, ReconfigStatus } from '@/constants/devbox'

export type KBDevboxType = {
  apiVersion: 'devbox.sealos.io/v1alpha1'
  kind: 'Devbox'
  metadata: {
    name: string
    uid: string
    creationTimestamp: string
  }
  spec: KBDevboxSpec
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

// TODO:有些值可以枚举处理的，这里先不处理了
export interface KBDevboxSpec {
  runtimeType: string
  runtimeVersion: string
  network: {
    type: 'NodePort' | 'Tailnet'
    extraPorts: NetworkType[]
  }
  resource: {
    cpu: string
    memory: string
  }
  runtimeRef: {
    name: string
  }
  state: DevboxStatusEnum
}

export interface NetworkType {
  containerPort: number
  hostPort?: number
  protocol?: string
  name?: string
}

export type KBDevboxVersionType = {
  apiVersion: 'devbox.sealos.io/v1alpha1'
  kind: 'DevboxRelease'
  metadata: {
    name: string
    uid: string
    creationTimestamp: string
  }
  spec: KBDevboxVersionSpec
}

export interface KBDevboxVersionSpec {
  devboxName: string
  newTag: string
  notes: string
}
