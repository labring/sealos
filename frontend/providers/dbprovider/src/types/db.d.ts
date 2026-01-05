import { BackupStatusEnum, BackupTypeEnum } from '@/constants/backup';
import { DBStatusEnum, DBTypeEnum } from '@/constants/db';
import type {
  V1ConfigMap,
  V1ContainerStatus,
  V1Deployment,
  V1HorizontalPodAutoscaler,
  V1Ingress,
  V1Pod,
  V1Secret,
  V1Service,
  V1StatefulSet
} from '@kubernetes/client-node';
import { AutoBackupFormType } from './backup';
import { KbPgClusterType, KubeBlockClusterTerminationPolicy } from './cluster';
import { I18nCommonKey } from './i18next';

export type DBType = `${DBTypeEnum}`;

export type CPUResourceEnum = 0.5 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type MemoryResourceEnum = 0.5 | 1 | 2 | 4 | 6 | 8 | 12 | 16 | 32;
export type ReplicasResourceEnum = 1 | 2 | 3;

export type SupportMigrationDBType = Extract<
  DBType,
  'postgresql' | 'mongodb' | 'apecloud-mysql' | 'mysql'
>;

export type SupportConnectDBType = Extract<
  DBType,
  'postgresql' | 'mongodb' | 'apecloud-mysql' | 'mysql'
>;

export type SupportReconfigureDBType = Extract<
  DBType,
  'postgresql' | 'mongodb' | 'apecloud-mysql' | 'redis' | 'mysql'
>;

export type DeployKindsType =
  | V1Deployment
  | V1StatefulSet
  | V1ConfigMap
  | V1Service
  | V1Ingress
  | V1Secret
  | V1HorizontalPodAutoscaler;

export type EditType = 'form' | 'yaml';

export interface DBStatusMapType {
  label: string;
  value: `${DBStatusEnum}`;
  color: string;
  backgroundColor: string;
  dotColor: string;
}

export interface DBListItemType {
  id: string;
  name: string;
  dbType: DBType;
  status: DBStatusMapType;
  createTime: string;
  cpu: number;
  memory: number;
  storage: number;
  replicas: number;
  totalCpu: number;
  totalMemory: number;
  totalStorage: number;
  conditions: DBConditionItemType[];
  isDiskSpaceOverflow: boolean;
  labels: { [key: string]: string };
  source: DBSource;
  remark: string;
}

export type DBComponentsName =
  | 'postgresql'
  | 'mongodb'
  | 'mysql'
  | 'redis'
  | 'redis-sentinel'
  | 'kafka'
  | 'kafka-server'
  | 'kafka-broker'
  | 'controller'
  | 'kafka-exporter'
  | 'milvus'
  | 'etcd'
  | 'minio'
  | 'qdrant'
  | 'nebula-console'
  | 'nebula-graphd'
  | 'nebula-metad'
  | 'nebula-storaged'
  | 'weaviate'
  | 'bookies'
  | 'pulsar-proxy'
  | 'ch-keeper'
  | 'clickhouse'
  | 'zookeeper';

export interface DBEditType {
  dbType: DBType;
  dbVersion: string;
  dbName: string;
  replicas: number;
  cpu: number;
  memory: number;
  storage: number;
  labels: { [key: string]: string };
  terminationPolicy: KubeBlockClusterTerminationPolicy;
  autoBackup?: AutoBackupFormType;
  parameterConfig?: {
    maxConnections?: string;
    timeZone?: string;
    lowerCaseTableNames?: string;
    isMaxConnectionsCustomized?: boolean;
    maxmemory?: string;
  };
}

export type DBSourceType = 'app_store' | 'sealaf';

export type DBSource = {
  hasSource: boolean;
  sourceName: string;
  sourceType: DBSourceType;
};

export interface DBDetailType extends DBEditType {
  id: string;
  createTime: string;
  status: DBStatusMapType;
  conditions: DBConditionItemType[];
  isDiskSpaceOverflow: boolean;
  labels: { [key: string]: string };
  source: DBSource;
  totalCpu: number;
  totalMemory: number;
  totalStorage: number;
  cluster?: KbPgClusterType; // cluster info
}

export interface DBConditionItemType {
  lastTransitionTime: string;
  message: string;
  observedGeneration: 3;
  reason: string;
  status: 'True' | 'False';
  type: string;
}

export interface PodDetailType extends V1Pod {
  podName: string;
  status: V1ContainerStatus[];
  nodeName: string;
  ip: string;
  hostIp: string;
  restarts: number;
  age: string;
  cpu: number;
  memory: number;
}

export interface PodEvent {
  id: string;
  reason: string;
  message: string;
  count: number;
  type: string | 'Normal' | 'Warning';
  firstTime: string;
  lastTime: string;
}

export interface BackupStatusMapType {
  label: string;
  value: `${BackupStatusEnum}`;
  color: string;
}
export interface BackupItemType {
  id: string;
  name: string;
  remark: string;
  status: BackupStatusMapType;
  startTime: Date;
  failureReason?: string;
  type: `${BackupTypeEnum}`;
  namespace: string;
  connectionPassword: string;
  dbName: string;
  dbType: string;
}

export type ReconfigStatusMapType = {
  label: I18nCommonKey;
  value: ReconfigStatus;
  color: string;
};

export interface OpsRequestItemType {
  id: string;
  name: string;
  status: ReconfigStatusMapType;
  startTime: Date;
  namespace: string;
  configurations?: { parameterName: string; newValue: string; oldValue?: string }[];
  switchover?: {
    componentName: string;
    instanceName: string;
  };
}

export type ParameterConfigField = ParameterConfigStringField | ParameterConfigEnumField;

export type ParameterConfigStringField = {
  name: string;
  type: 'string';
  description?: string;
};

export type ParameterConfigEnumField = {
  name: string;
  type: 'enum';
  description?: string;
  values: string[];
};

export type ParameterFieldMetadata = {
  /**
   * Whether the field is editable.
   * Whitelist mode: only explicitly true fields are editable.
   * @default false
   */
  editable?: boolean;
  /**
   * Whether the field is hidden.
   * Blacklist mode: only explicitly true fields are hidden.
   * @default false
   */
  hidden?: boolean;
};

type ConfigParameterBase = {
  key: string;
  value: string;
  description?: string;
  /**
   * Whether the field is editable.
   * Whitelist mode: only explicitly true fields are editable.
   * @default false
   */
  editable: boolean;
  /**
   * Whether the field is hidden.
   * Blacklist mode: only explicitly true fields are hidden.
   * @default false
   */
  hidden?: boolean;
};

type ConfigParameterStringType = {
  type: 'string';
};

type ConfigParameterEnumType = {
  type: 'enum';
  enumValues: string[];
};

export type ConfigParameterStringItem = ConfigParameterBase & ConfigParameterStringType;

export type ConfigParameterEnumItem = ConfigParameterBase & ConfigParameterEnumType;

export type ConfigParameterItem = ConfigParameterStringItem | ConfigParameterEnumItem;
