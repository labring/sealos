import {
  DevboxStatusEnum,
  gpuNodeSelectorKey,
  PodStatusEnum,
  ReconfigStatus,
  gpuResourceKey,
  devboxRemarkKey
} from '@/constants/devbox';

// TODO: delete v2 string
export type KBDevboxTypeV2 = {
  apiVersion: 'devbox.sealos.io/v1alpha2';
  kind: 'Devbox';
  metadata: {
    name: string;
    uid: string;
    creationTimestamp: string;
    annotations: {
      [devboxRemarkKey]?: string;
    };
  };
  spec: KBDevboxSpecV2;
  status: {
    // lastState: {
    //   terminated?: {
    //     containerID: string;
    //     exitCode: number;
    //     finishedAt: string;
    //     reason: string; // normally is Error if it not null
    //     startedAt: string;
    //   };
    // };
    state: 'Pending' | 'Running' | 'Stopped' | 'Stopping' | 'Error' | 'Unknown' | 'Shutdown';
    phase: 'Pending' | 'Running' | 'Stopped' | 'Stopping' | 'Error' | 'Unknown' | 'Shutdown';
    contentID: string; // first item sha of commitRecords
    commitRecords: {
      [contentID: string]: {
        baseImage: string;
        commitImage: string;
        commitStatus:
          | 'Pending'
          | 'Running'
          | 'Stopped'
          | 'Stopping'
          | 'Error'
          | 'Unknown'
          | 'Shutdown';
        commitTime?: string;
        generateTime: string;
        node: string;
        updateTime?: string;
      };
    }[];
    network: {
      nodePort: number;
      tailnet: string;
      type: 'NodePort' | 'Tailnet' | 'SSHGate';
      uniqueID?: string;
    };
    podPhase: 'Pending' | 'Running' | 'Stopped' | 'Stopping' | 'Error' | 'Delete';
  };
};
export interface KBDevboxSpecV2 {
  runtimeClassName?: string; // devbox-runtime
  storageLimit?: string; // 10Gi
  config: object;
  image: string;
  templateID: string;
  network: {
    type: 'NodePort' | 'Tailnet' | 'SSHGate'; // devbox 2.5 add SSHGate
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
  apiVersion: 'devbox.sealos.io/v1alpha2';
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
    version: string;
    notes?: string;
    startDevboxAfterRelease: boolean;
  };
  status: {
    sourceImage?: string;
    phase: 'Pending' | 'Success' | 'Failed';
  };
};

export type KBRuntimeType = {
  apiVersion: 'devbox.sealos.io/v1alpha2';
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
  apiVersion: 'devbox.sealos.io/v1alpha2';
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
