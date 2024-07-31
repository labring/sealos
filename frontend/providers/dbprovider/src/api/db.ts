import { GET, POST, DELETE } from '@/services/request';
import { adaptDBListItem, adaptDBDetail, adaptPod, adaptEvents } from '@/utils/adapt';
import type {
  BackupItemType,
  DBEditType,
  DBType,
  OpsRequestItemType,
  PodDetailType
} from '@/types/db';
import { json2Restart } from '@/utils/json2Yaml';
import { json2StartOrStop } from '../utils/json2Yaml';
import type { SecretResponse } from '@/pages/api/getSecretByName';
import { V1Service, V1StatefulSet } from '@kubernetes/client-node';
import { KbPgClusterType } from '@/types/cluster';
import { MonitorChartDataResult } from '@/types/monitor';

export const getMyDBList = () =>
  GET<KbPgClusterType[]>('/api/getDBList').then((data) => data.map(adaptDBListItem));

export const getDBByName = (name: string) =>
  GET(`/api/getDBByName?name=${name}`).then(adaptDBDetail);

export const getConfigByName = ({ name, dbType }: { name: string; dbType: DBType }) =>
  GET<string>(`/api/getConfigByName?name=${name}&dbType=${dbType}`);

export const createDB = (payload: {
  dbForm: DBEditType;
  isEdit: boolean;
  backupInfo?: BackupItemType;
}) => POST(`/api/createDB`, payload);

export const getDBEvents = (name: string) => GET(`/api/getDBEvents?name=${name}`);

export const getDBSecret = (data: { dbName: string; dbType: DBType }) =>
  GET<SecretResponse>(`/api/getSecretByName`, data);
export const delDBByName = (name: string) => DELETE('/api/delDBByName', { name });

export const applyYamlList = (yamlList: string[], type: 'create' | 'replace' | 'update') =>
  POST('/api/applyYamlList', { yamlList, type });

export const getPodsByDBName = (name: string): Promise<PodDetailType[]> =>
  GET('/api/pod/getPodsByDBName', { name }).then((res) => res.map(adaptPod));

export const getPodLogs = (data: {
  dbName: string;
  podName: string;
  stream: boolean;
  logSize?: number;
  dbType: string;
}) => POST<string>(`/api/pod/getPodLogs`, data);

export const getPodEvents = (podName: string) =>
  GET(`/api/pod/getPodEvents?podName=${podName}`).then(adaptEvents);

export const restartPodByName = (podName: string) => GET(`/api/pod/restartPod?podName=${podName}`);

/* db operation */
export const restartDB = (data: { dbName: string; dbType: DBType }) => {
  const yaml = json2Restart(data);
  return applyYamlList([yaml], 'update');
};

export const pauseDBByName = (data: { dbName: string; dbType: DBType }) => {
  const yaml = json2StartOrStop({
    ...data,
    type: 'Stop'
  });
  return applyYamlList([yaml], 'update');
};

export const startDBByName = (data: { dbName: string; dbType: DBType }) => {
  const yaml = json2StartOrStop({
    ...data,
    type: 'Start'
  });
  return applyYamlList([yaml], 'update');
};

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

export const getOpsRequest = ({
  name,
  label,
  dbType
}: {
  name: string;
  label: string;
  dbType: DBType;
}) =>
  GET<OpsRequestItemType[]>(`/api/opsrequest/list`, {
    name,
    label,
    dbType
  });
