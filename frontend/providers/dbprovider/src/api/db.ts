import type { SecretResponse } from '@/pages/api/getSecretByName';
import { DELETE, GET, POST } from '@/services/request';
import type {
  BackupItemType,
  DBDetailType,
  DBEditType,
  DBListItemType,
  DBType,
  OpsRequestItemType,
  PodDetailType,
  SupportReconfigureDBType
} from '@/types/db';
import { LogTypeEnum } from '@/constants/log';
import { MonitorChartDataResult } from '@/types/monitor';
import { adaptEvents } from '@/utils/adapt';
import { json2BasicOps } from '@/utils/json2Yaml';
import { TFile } from '@/utils/kubeFileSystem';
import { LogResult } from '@/utils/logParsers/LogParser';
import { V1ObjectMeta, V1Service, V1StatefulSet } from '@kubernetes/client-node';
import { AxiosRequestConfig } from 'axios';
import { SwitchMsData } from '@/pages/api/pod/switchPodMs';
import { EditPasswordReq } from '@/pages/api/db/editPassword';
import { RequiredByKeys } from '@/utils/tools';

export const getMyDBList = () => GET<DBListItemType[]>('/api/getDBList');

// Database Alerts
export type DatabaseAlertItem = {
  name: string;
  status: string;
  reason: string;
  details: string;
};

export const getDatabaseAlerts = (namespace: string) =>
  GET<DatabaseAlertItem[]>(`/api/proxy/get_db_alerts`, {
    namespace
  });

// Mock function for testing - remove this in production
export const getMockDatabaseAlerts = (): DatabaseAlertItem[] => [
  {
    name: 'm1',
    status: 'Abnormal',
    reason: '集群状态异常',
    details:
      '数据库集群状态异常，可能存在以下问题：\n1. Pod 健康检查失败\n2. 资源不足\n3. 网络连接问题\n\n建议检查 Pod 状态和日志以获取更多信息。'
  },
  {
    name: 'sealos-mongo',
    status: 'Stopped',
    reason: '',
    details: ''
  },
  {
    name: 'sealos-mongodb',
    status: 'Running',
    reason: '',
    details: ''
  },
  {
    name: 'test-clickhouse',
    status: 'Running',
    reason: 'Pod 健康检查失败',
    details:
      'Unhealthy - Pod test-clickhouse-zookeeper-0: Liveness probe failed: \nUnhealthy - Pod test-clickhouse-zookeeper-0: Readiness probe failed: \n\nZookeeper 组件健康检查失败，可能原因：\n1. 内存不足\n2. 磁盘空间不足\n3. 配置错误\n\n建议检查 Pod 资源使用情况和日志。'
  },
  {
    name: 'mll',
    status: 'Updating',
    reason: '配置更新中',
    details:
      'Redis 集群正在更新配置，当前状态：\n1. 主节点配置已更新\n2. 从节点同步中\n3. 预计完成时间：2-3分钟\n\n更新期间服务可能短暂不可用。'
  },
  {
    name: 'postgresql-ha',
    status: 'Failed',
    reason: '部署失败',
    details:
      'PostgreSQL 高可用集群部署失败：\n1. 存储卷创建失败\n2. 服务端口冲突\n3. 权限配置错误\n\n错误代码: E001\n建议检查存储配置和网络设置。'
  }
];

export const getDBByName = ({
  name,
  mock = false,
  config
}: {
  name: string;
  mock?: boolean;
  config?: AxiosRequestConfig;
}) => GET<DBDetailType>(`/api/getDBByName?name=${name}&mock=${mock}`, {}, config);

export const getConfigByName = ({ name, dbType }: { name: string; dbType: DBType }) =>
  GET<string>(`/api/getConfigByName?name=${name}&dbType=${dbType}`);

export const createDB = (payload: {
  dbForm: DBEditType;
  isEdit: boolean;
  backupInfo?: BackupItemType;
}) => POST(`/api/createDB`, payload);

export const getDBEvents = (name: string) => GET(`/api/getDBEvents?name=${name}`);

export const getDBSecret = (data: { dbName: string; dbType: DBType; mock?: boolean }) =>
  GET<SecretResponse>(`/api/getSecretByName`, data);

export const delDBByName = (name: string) => DELETE('/api/delDBByName', { name });

export const applyYamlList = (yamlList: string[], type: 'create' | 'replace' | 'update') =>
  POST('/api/applyYamlList', { yamlList, type });

export const getPodsByDBName = (name: string): Promise<PodDetailType[]> =>
  GET('/api/pod/getPodsByDBName', { name });

export const getPodLogs = (data: {
  dbName: string;
  podName: string;
  stream: boolean;
  logSize?: number;
  dbType: string;
  sinceTime?: number;
  previous?: boolean;
}) => POST<string>(`/api/pod/getPodLogs`, data);

export const getPodEvents = (podName: string) =>
  GET(`/api/pod/getPodEvents?podName=${podName}`).then(adaptEvents);

export const restartPodByName = (podName: string) => GET(`/api/pod/restartPod?podName=${podName}`);

/* db operation */
export const restartDB = (data: { dbName: string; dbType: DBType }) => {
  const yaml = json2BasicOps({ ...data, type: 'Restart' });
  return applyYamlList([yaml], 'update');
};

export const pauseDBByName = (data: { dbName: string; dbType: DBType }) =>
  POST('/api/pauseDBByName', data);

export const startDBByName = (data: { dbName: string; dbType: DBType }) =>
  POST('/api/startDBByName', data);

export const switchPodMs = (data: SwitchMsData) =>
  POST<{ metadata: V1ObjectMeta; message: string }>('/api/pod/switchPodMs', data);

export const getDBServiceByName = (name: string) =>
  GET<V1Service>(`/api/getServiceByName?name=${name}`);

export const delDBServiceByName = (name: string) => DELETE('/api/delServiceByName', { name });

export const getDBStatefulSetByName = (name: string, dbType: DBType) =>
  GET<V1StatefulSet>(`/api/getStatefulSetByName?name=${name}&dbType=${dbType}`);

export const adapterMongoHaConfig = (payload: { name: string }) =>
  POST('/api/adapter/mongodb', payload);

export const getMonitorData = (payload: {
  dbName: string;
  dbType: string;
  queryKey: string;
  start: number;
  end: number;
}) => GET<{ result: MonitorChartDataResult }>(`/api/monitor/getMonitorData`, payload);

export const getOpsRequest = <T extends keyof OpsRequestItemType>(payload: {
  name: string;
  label: string;
  dbType: DBType;
}) => GET<RequiredByKeys<OpsRequestItemType, T>[]>(`/api/opsrequest/list`, payload);

export const getOperationLog = (payload: { name: string; dbType: DBType }) =>
  GET<OpsRequestItemType[]>(`/api/opsrequest/operationlog`, payload);

export const getLogFiles = (payload: {
  podName: string;
  dbType: SupportReconfigureDBType;
  logType: LogTypeEnum;
}) => POST<TFile[]>(`/api/logs/getFiles`, payload);

export const getLogContent = (payload: {
  logPath: string;
  page: number;
  pageSize: number;
  dbType: SupportReconfigureDBType;
  logType: LogTypeEnum;
  podName: string;
}) => POST<LogResult>(`/api/logs/get`, payload);

export const getDatabases = (payload: { dbName: string; dbType: DBType }) =>
  POST<Array<string>>(`/api/db/getDatabases`, payload);

export const getTables = (payload: { dbName: string; dbType: DBType; databaseName: string }) =>
  POST<Array<string>>(`/api/db/getTables`, payload);

export const editPassword = (payload: EditPasswordReq) => POST('/api/db/editPassword', payload);

export const setDBRemark = (payload: { dbName: string; remark: string }) =>
  POST('/api/remark', payload);
