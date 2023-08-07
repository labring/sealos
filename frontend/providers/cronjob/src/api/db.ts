import { GET, POST, DELETE } from '@/services/request';
import { adaptDBListItem, adaptDBDetail, adaptPod, adaptEvents } from '@/utils/adapt';
import type { DBType, PodDetailType } from '@/types/db';
import { json2Restart } from '@/utils/json2Yaml';
import { json2StartOrStop } from '../utils/json2Yaml';
import type { SecretResponse } from '@/pages/api/getSecretByName';

export const getMyDBList = () => GET('/api/getDBList').then((data) => data.map(adaptDBListItem));

export const getDBByName = (name: string) =>
  GET(`/api/getDBByName?name=${name}`).then(adaptDBDetail);

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
