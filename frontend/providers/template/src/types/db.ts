import { V1Condition } from '@kubernetes/client-node';
import { StatusMapType } from './status';
import { StatusEnum } from '@/constants/status';

export enum DBTypeEnum {
  postgresql = 'postgresql',
  mongodb = 'mongodb',
  mysql = 'apecloud-mysql',
  redis = 'redis'
}

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
}

export interface KubeBlockClusterStatus {
  clusterDefGeneration: number;
  components: object;
  conditions: V1Condition[];
  observedGeneration: number;
  phase: `${StatusEnum}`;
}

export type DBType = `${DBTypeEnum}`;

export interface DBListItemType {
  id: string;
  name: string;
  dbType: DBType;
  status: StatusMapType;
  createTime: string;
  cpu: number;
  memory: number;
  storage: string;
  conditions: V1Condition[];
}
