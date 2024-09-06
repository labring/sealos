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
  portInfos: {
    networkName: string
    portName: string
    port: number
    protocol: ProtocolType
    openPublicDomain: boolean
    publicDomain: string
    customDomain: string
  }[]
  status: {
    commitHistory: {
      image: string
      pod: string
      status: string
      time: string
    }[]
    network: {
      nodePort: number
      tailnet: string
      type: 'NodePort' | 'Tailnet'
    }
    podPhase: string
  }
}

// note: there first three runtime type is I added by logic in api/getDevboxList/route.ts
export interface KBDevboxSpec {
  runtimeType?: string
  runtimeVersion?: string
  runtimeNamespace?: string
  network: {
    type: 'NodePort' | 'Tailnet'
    extraPorts: {
      containerPort: number
      hostPort?: number
      protocol?: string
      name?: string
    }[]
    // next all is added by logic in api/getDevboxList/route.ts
    networkName?: string
    port?: string
    portName?: string
    protocol?: string
    openPublicDomain?: boolean
    publicDomain?: string
    customDomain?: string
  }
  resource: {
    cpu: string
    memory: string
  }
  runtimeRef: {
    name: string
    namespace: string
  }
  state: DevboxStatusEnum
  tolerations?: {
    key: string
    operator: string
    effect: string
  }[]
  affinity?: {
    nodeAffinity: {
      requiredDuringSchedulingIgnoredDuringExecution: {
        nodeSelectorTerms: {
          matchExpressions: {
            key: string
            operator: string
          }[]
        }[]
      }
    }
  }
}

export type KBDevboxReleaseType = {
  apiVersion: 'devbox.sealos.io/v1alpha1'
  kind: 'DevboxRelease'
  metadata: {
    name: string
    uid: string
    creationTimestamp: string
  }
  spec: {
    devboxName: string
    newTag: string
    notes: string
  }
}

export type KBRuntimeType = {
  apiVersion: 'devbox.sealos.io/v1alpha1'
  kind: 'Runtime'
  metadata: {
    name: string
    namespace: string
    uid: string
    creationTimestamp: string
  }
  spec: {
    category: string[]
    classRef: string
    config: {
      image: string
      ports: {
        containerPort: number
        name?: string
        protocol?: string
      }[]
      user: string
    }
    description: string
    title: string
  }
}

export type KBRuntimeClassType = {
  apiVersion: 'devbox.sealos.io/v1alpha1'
  kind: 'RuntimeClass'
  metadata: {
    name: string
    namespace: string
    uid: string
    creationTimestamp: string
  }
  spec: {
    kind: string
    title: string
    description: string
  }
}
