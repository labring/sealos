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
    // Added by logic in api/getDevboxList/route.ts
    networkName: string
    portName: string
    port: number
    protocol: ProtocolType
    openPublicDomain: boolean
    publicDomain: string
    customDomain: string
  }[]
  lastTerminatedState: {
    containerID: string
    exitCode: number
    finishedAt: string
    reason: string
    startedAt: string
  }
  status: {
    phase: 'Pending' | 'Running' | 'Stopped' | 'Stopping' | 'Error' | 'Delete'
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
    podPhase: 'Pending' | 'Running' | 'Stopped' | 'Stopping' | 'Error' | 'Delete'
  }
}

// note: there first three runtime type is I added by logic in api/getDevboxList/route.ts
export interface KBDevboxSpec {
  runtimeType?: string
  runtimeVersion?: string
  runtimeNamespace?: string
  squash?: boolean
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
  status: {
    originImage?: string
    phase: 'Pending' | 'Success' | 'Failed'
  }
}

export type KBRuntimeType = {
  apiVersion: 'devbox.sealos.io/v1alpha1'
  kind: 'Runtime'
  metadata: {
    name: string // go-v1-22-5 name+version
    namespace: string
    uid: string
    creationTimestamp: string
  }
  spec: {
    classRef: string
    config: {
      // appPorts is used to network default expose ports
      appPorts: {
        name: string // devbox-app-port
        port: number
        protocol: string // TCP normally
      }[]
      image: string
      ports: {
        containerPort: number
        name?: string // devbox-ssh-port
        protocol?: string
      }[]
      user: string
      workingDir: string
      releaseCommand: string[]
      releaseArgs: string[]
    }
    category: string[]
    description: string
    version: string
    components: {
      name: string // go
      kind: string // language
      version: string // v1.22.5
    }[]
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
