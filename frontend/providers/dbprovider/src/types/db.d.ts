import { DBTypeEnum, DBStatusEnum, PodStatusEnum } from '@/constants/db';
import { BackupStatusEnum, BackupTypeEnum } from '@/constants/backup';
import type {
  V1Deployment,
  V1ConfigMap,
  V1Service,
  V1Ingress,
  V1Secret,
  V1HorizontalPodAutoscaler,
  V1Pod,
  SinglePodMetrics,
  V1StatefulSet,
  V1ContainerStatus
} from '@kubernetes/client-node';
import { I18nCommonKey } from './i18next';

export type DBType = `${DBTypeEnum}`;

export type SupportMigrationDBType = Extract<DBType, 'postgresql' | 'mongodb' | 'apecloud-mysql'>;

export type SupportConnectDBType = Extract<DBType, 'postgresql' | 'mongodb' | 'apecloud-mysql'>;

export type SupportReconfigureDBType = Extract<
  DBType,
  'postgresql' | 'mongodb' | 'apecloud-mysql' | 'redis'
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
  storage: string;
  conditions: DBConditionItemType[];
  isDiskSpaceOverflow: boolean;
  labels: { [key: string]: string };
}

export interface DBEditType {
  dbType: DBType;
  dbVersion: string;
  dbName: string;
  replicas: number;
  cpu: number;
  memory: number;
  storage: number;
}

export interface DBDetailType extends DBEditType {
  id: string;
  createTime: string;
  status: DBStatusMapType;
  conditions: DBConditionItemType[];
  isDiskSpaceOverflow: boolean;
  labels: { [key: string]: string };
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
  configurations: { parameterName: string; newValue: string; oldValue?: string }[];
}
