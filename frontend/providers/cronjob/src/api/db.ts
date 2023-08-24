import { DELETE, GET, POST } from '@/services/request';
import type { DBType } from '@/types/db';
import type { SecretResponse } from '@/pages/api/getSecretByName';

export const getDBEvents = (name: string) => GET(`/api/getDBEvents?name=${name}`);

export const getDBSecret = (data: { dbName: string; dbType: DBType }) =>
  GET<SecretResponse>(`/api/getSecretByName`, data);
export const delDBByName = (name: string) => DELETE('/api/delDBByName', { name });

export const applyYamlList = (yamlList: string[], type: 'create' | 'replace' | 'update') =>
  POST('/api/applyYamlList', { yamlList, type });

export const getPodLogs = (data: {
  dbName: string;
  podName: string;
  stream: boolean;
  logSize?: number;
}) => POST<string>(`/api/pod/getPodLogs`, data);

export const restartPodByName = (podName: string) => GET(`/api/pod/restartPod?podName=${podName}`);

export const pauseJobByName = (data: { dbName: string; dbType: DBType }) => {
  const yaml = json2StartOrStop({
    ...data,
    type: 'Stop'
  });
  return applyYamlList([yaml], 'update');
};
