import type { SecretResponse } from '@/pages/api/getSecretByName';
import { DELETE, GET, POST } from '@/services/request';
import type {
  BackupItemType,
  ConfigParameterItem,
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
  GET<ConfigParameterItem[]>(`/api/getConfigByName?name=${name}&dbType=${dbType}`);

export const applyReconfigureOps = (payload: {
  dbName: string;
  dbType: DBType;
  differences: { path: string; oldValue: string; newValue: string }[];
}) => POST('/api/applyReconfigureOps', payload);

export const createDB = (payload: {
  dbForm: DBEditType;
  isEdit: boolean;
  backupInfo?: BackupItemType;
}) => POST(`/api/createDB`, payload);

export const restoreBackup = (payload: { databaseName: string; backupName: string }) =>
  POST(`/api/restoreBackup`, payload);

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

/**
 * kb 0.9 StatefulSets have all been changed to instancesets
 * @param name
 * @param dbType
 * @returns
 * @deprecated
 */
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

export const getDatabases = (payload: { dbName: string; dbType: DBType }) =>
  POST<Array<string>>(`/api/db/getDatabases`, payload);

export const getTables = (payload: { dbName: string; dbType: DBType; databaseName: string }) =>
  POST<Array<string>>(`/api/db/getTables`, payload);

export const editPassword = (payload: EditPasswordReq) => POST('/api/db/editPassword', payload);

export const setDBRemark = (payload: { dbName: string; remark: string }) =>
  POST('/api/remark', payload);

// ========== Vlogs API Functions ==========

export const getVlogsDatabaseLogs = (payload: {
  namespace: string;
  pvc: string[];
  containers: string[];
  type: Array<'run' | 'slow' | 'error'>;
  startTime?: number;
  endTime?: number;
  timeRange?: string;
  keyword?: string;
  pageSize?: number;
  timeZone?: 'local' | 'utc';
}) => POST<LogResult>(`/api/vlogs/database-logs`, payload);

export const getVlogsDatabasePods = (payload: {
  dbName: string;
  dbType: SupportReconfigureDBType;
  startTime?: number;
  endTime?: number;
  timeRange?: string;
  timeZone?: 'local' | 'utc';
}) =>
  POST<{
    pods: { podName: string; alias: string; pvcUids: string[] }[];
    pvcMap: Record<string, string>; // pvcUid -> podName 映射
  }>(`/api/vlogs/database-pods`, payload);

export const getVlogsDatabaseLogCounts = (payload: {
  namespace: string;
  pvc: string[];
  containers: string[];
  type: Array<'run' | 'slow' | 'error'>;
  startTime?: number;
  endTime?: number;
  timeRange?: string;
  keyword?: string;
  timeZone?: 'local' | 'utc';
}) => POST<{ logs_total: string; _time: string }[]>(`/api/vlogs/database-log-counts`, payload);
