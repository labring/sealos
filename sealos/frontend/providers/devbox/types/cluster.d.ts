import { DBType, DBStatusEnum } from './db';

export type KbPgClusterType = {
  apiVersion: 'apps.kubeblocks.io/v1alpha1';
  kind: 'Cluster';
  metadata: {
    annotations: Record<string, string>;
    creationTimestamp: Date;
    labels: {
      'clusterdefinition.kubeblocks.io/name': DBType;
      'clusterversion.kubeblocks.io/name': string;
      'sealos-db-provider/postgresql': string;
      [key: string]: string;
    };
    name: string;
    namespace: string;
    uid: string;
  };
  spec: KubeBlockClusterSpec;
  status?: KubeBlockClusterStatus;
};

export interface KubeBlockClusterSpec {
  clusterDefinitionRef: DBType;
  clusterVersionRef: string;
  terminationPolicy: string;
  componentSpecs: {
    componentDefRef: DBType;
    name: DBType;
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

export interface DBListItemType {
  id: string;
  name: string;
  dbType: DBType;
  createTime: string;
  cpu: number;
  memory: number;
  storage: string;
}
