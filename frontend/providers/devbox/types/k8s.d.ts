import {
  DevboxStatusEnum,
  gpuNodeSelectorKey,
  PodStatusEnum,
  ReconfigStatus,
  gpuResourceKey
} from '@/constants/devbox';

export type KBDevboxType = {
  apiVersion: 'devbox.sealos.io/v1alpha1';
  kind: 'Devbox';
  metadata: {
    name: string;
    uid: string;
    creationTimestamp: string;
  };
  spec: KBDevboxSpec;
  status: {
    lastState: {
      terminated?: {
        containerID: string;
        exitCode: number;
        finishedAt: string;
        reason: string; // normally is Error if it not null
        startedAt: string;
      };
    };
    state: {
      running?: {
        startedAt: string;
      };
      waiting?: {
        message: string;
        reason: string;
      };
      terminated?: {
        containerID: string;
        exitCode: number;
        finishedAt: string;
        reason: string;
        startedAt: string;
      };
    };
    phase: 'Pending' | 'Running' | 'Stopped' | 'Stopping' | 'Error' | 'Unknown';
    commitHistory: {
      image: string;
      pod: string;
      status: string;
      time: string;
    }[];
    network: {
      nodePort: number;
      tailnet: string;
      type: 'NodePort' | 'Tailnet';
    };
    podPhase: 'Pending' | 'Running' | 'Stopped' | 'Stopping' | 'Error' | 'Delete';
  };
};
export type KBDevboxTypeV2 = {
  apiVersion: 'devbox.sealos.io/v1alpha1';
  kind: 'Devbox';
  metadata: {
    name: string;
    uid: string;
    creationTimestamp: string;
  };
  spec: KBDevboxSpecV2;
  status?: {
    lastState: {
      terminated?: {
        containerID: string;
        exitCode: number;
        finishedAt: string;
        reason: string; // normally is Error if it not null
        startedAt: string;
      };
    };
    state: {
      running?: {
        startedAt: string;
      };
      waiting?: {
        message: string;
        reason: string;
      };
      terminated?: {
        containerID: string;
        exitCode: number;
        finishedAt: string;
        reason: string;
        startedAt: string;
      };
    };
    phase: 'Pending' | 'Running' | 'Stopped' | 'Stopping' | 'Error' | 'Unknown';
    commitHistory: {
      image: string;
      pod: string;
      status: string;
      time: string;
    }[];
    network: {
      nodePort: number;
      tailnet: string;
      type: 'NodePort' | 'Tailnet';
    };
    podPhase: 'Pending' | 'Running' | 'Stopped' | 'Stopping' | 'Error' | 'Delete';
  };
};
// note: runtimeType is I added by logic in api/getDevboxList/route.ts
export interface KBDevboxSpec {
  runtimeType?: string;

  squash?: boolean;
  network: {
    type: 'NodePort' | 'Tailnet';
    extraPorts: {
      // NOTE: this object is deprecated, will be removed in the future
      containerPort: number;
      hostPort?: number;
      protocol?: string;
      name?: string;
    }[];
    // next all is added by logic in api/getDevboxList/route.ts
    networkName?: string;
    port?: string;
    portName?: string;
    protocol?: string;
    openPublicDomain?: boolean;
    publicDomain?: string;
    customDomain?: string;
  };
  resource: {
    cpu: string;
    memory: string;
    [gpuResourceKey]?: string;
  };
  runtimeRef: {
    name: string;
    namespace: string;
  };
  nodeSelector?: {
    [gpuNodeSelectorKey]: string;
  };
  state: DevboxStatusEnum;
  tolerations?: {
    key: string;
    operator: string;
    effect: string;
  }[];
  affinity?: {
    nodeAffinity: {
      requiredDuringSchedulingIgnoredDuringExecution: {
        nodeSelectorTerms: {
          matchExpressions: {
            key: string;
            operator: string;
          }[];
        }[];
      };
    };
  };
}
export interface KBDevboxSpecV2 {
  squash?: boolean;
  config: object;
  image: string;
  templateID: string;
  network: {
    type: 'NodePort' | 'Tailnet';
    extraPorts: {
      containerPort: number;
      hostPort?: number;
      protocol?: string;
      name?: string;
    }[];
    // next all is added by logic in api/getDevboxList/route.ts
    networkName?: string;
    port?: string;
    portName?: string;
    protocol?: string;
    openPublicDomain?: boolean;
    publicDomain?: string;
    customDomain?: string;
  };
  resource: {
    cpu: string;
    memory: string;
    [gpuResourceKey]?: string;
  };
  nodeSelector?: {
    [gpuNodeSelectorKey]: string;
  };
  state: DevboxStatusEnum;
  tolerations?: {
    key: string;
    operator: string;
    effect: string;
  }[];
  affinity?: {
    nodeAffinity: {
      requiredDuringSchedulingIgnoredDuringExecution: {
        nodeSelectorTerms: {
          matchExpressions: {
            key: string;
            operator: string;
          }[];
        }[];
      };
    };
  };
}
export type KBDevboxReleaseType = {
  apiVersion: 'devbox.sealos.io/v1alpha1';
  kind: 'DevboxRelease';
  metadata: {
    name: string;
    uid: string;
    creationTimestamp: string;
    ownerReferences: {
      apiVersion: string;
      controller: boolean;
      kind: string;
      name: string;
      uid: string;
    }[];
  };
  spec: {
    devboxName: string;
    newTag: string;
    notes?: string;
  };
  status: {
    originalImage?: string;
    phase: 'Pending' | 'Success' | 'Failed';
  };
};

export type KBRuntimeType = {
  apiVersion: 'devbox.sealos.io/v1alpha1';
  kind: 'Runtime';
  metadata: {
    name: string; // go-v1-22-5 name+version
    namespace: string;
    uid: string;
    creationTimestamp: string;
    annotations: {
      'devbox.sealos.io/defaultVersion': boolean;
    };
  };
  spec: {
    classRef: string;
    config: {
      // appPorts is used to network default expose ports
      appPorts: {
        name: string; // devbox-app-port
        port: number;
        protocol: string; // TCP normally
      }[];
      image: string;
      ports: {
        containerPort: number;
        name?: string; // devbox-ssh-port
        protocol?: string;
      }[];
      user: string;
      workingDir: string;
      releaseCommand: string[];
      releaseArgs: string[];
    };
    state: 'active' | 'deprecated' | 'archived' | 'beta';
    runtimeVersion: string;
    category: string[];
    description: string;
    version: string;
    components: {
      name: string; // go
      kind: string; // language
      version: string; // v1.22.5
    }[];
    state: string;
    runtimeVersion: string;
  };
};

export type KBRuntimeClassType = {
  apiVersion: 'devbox.sealos.io/v1alpha1';
  kind: 'RuntimeClass';
  metadata: {
    name: string;
    namespace: string;
    uid: string;
    creationTimestamp: string;
  };
  spec: {
    kind: string;
    title: string;
    description: string;
  };
};
