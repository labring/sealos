import { DBStatusEnum, DBTypeEnum, PodStatusEnum, ReconfigStatus } from '@/constants/db';

export type KbPgClusterType = {
  apiVersion: 'apps.kubeblocks.io/v1alpha1';
  kind: 'Cluster';
  metadata: {
    annotations: Record<string, string>;
    creationTimestamp: Date;
    labels: {
      'clusterdefinition.kubeblocks.io/name': `${DBTypeEnum}`;
      'clusterversion.kubeblocks.io/name': string;
      'sealos-db-provider/postgresql': string;
    };
    name: string;
    namespace: string;
    uid: string;
  };
  spec: KubeBlockClusterSpec;
  status?: KubeBlockClusterStatus;
};

export interface KubeBlockClusterSpec {
  clusterDefinitionRef: `${DBTypeEnum}`;
  clusterVersionRef: string;
  terminationPolicy: string;
  componentSpecs: {
    componentDefRef: `${DBTypeEnum}`;
    name: `${DBTypeEnum}`;
    replicas: number;
    resources: {
      limits: {
        cpu: string;
        memory: string;
      };
      requests: {
        cpu: string;
        memory: string;
      };
    };
    volumeClaimTemplates: {
      name: 'data';
      spec: {
        accessModes: ['ReadWriteOnce'];
        resources: {
          requests: {
            storage: string;
          };
        };
      };
    }[];
  }[];
  backup: {
    enabled: boolean;
    cronExpression: string;
    method: string;
    pitrEnabled: boolean;
    repoName: string;
    retentionPeriod: string;
  };
}
export interface KubeBlockClusterStatus {
  clusterDefGeneration: number;
  components: object;
  conditions: k8s.V1Condition[];
  observedGeneration: number;
  phase: `${DBStatusEnum}`;
}

export type KbPodType = {
  metadata: {
    name: string;
    uid: string;
    labels: {
      'app.kubernetes.io/component': string;
      'app.kubernetes.io/instance': string;
      'app.kubernetes.io/managed-by': string;
      'app.kubernetes.io/name': string;
      'app.kubernetes.io/version': string;
      'apps.kubeblocks.io/component-name': string;
      'apps.kubeblocks.io/workload-type': string;
      'controller-revision-hash': string;
      'kubeblocks.io/role': string;
      'statefulset.kubernetes.io/pod-name': string;
    };
  };
  status: {
    phase: `${PodStatusEnum}`;
  };
};

export type KubeBlockBackupPolicyType = {
  metadata: {
    name: string;
    uid: string;
  };
  spec: {
    retention: {
      ttl: string;
    };
    schedule: {
      datafile: {
        cronExpression: string;
        enable: boolean;
      };
    };
  };
};

export type KubeBlockOpsRequestType = {
  apiVersion: string;
  kind: string;
  metadata: {
    creationTimestamp: Date;
    generation: number;
    labels: { [key: string]: string };
    name: string;
    namespace: string;
    uid: string;
    annotations: {
      [key: string]: string;
    };
  };
  spec: {
    clusterRef: string;
    reconfigure: {
      componentName: string;
      configurations: {
        keys: {
          key: string;
          parameters: {
            key: string;
            value: string;
          }[];
        }[];
        name: string;
      }[];
    };
    ttlSecondsBeforeAbort: number;
    type: string;
  };
  status: {
    clusterGeneration: number;
    completionTimestamp: string;
    conditions: {
      lastTransitionTime: string;
      message: string;
      reason: string;
      status: string;
      type: string;
    }[];
    phase: `${ReconfigStatus}`;
    progress: string;
    startTimestamp: string;
  };
};
