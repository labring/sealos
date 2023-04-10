import { GET, POST, DELETE } from '@/services/request';
import type { V1Deployment, V1Pod, SinglePodMetrics, V1StatefulSet } from '@kubernetes/client-node';
import {
  adaptAppListItem,
  adaptPod,
  adaptAppDetail,
  adaptMetrics,
  adaptEvents
} from '@/utils/adapt';
import { obj2Query } from './tools';

export const postDeployApp = (yamlList: string[]) => POST('/api/applyApp', { yamlList });

export const putApp = (yamlList: string[], appName: string) =>
  POST('/api/updateApp', { yamlList, appName });

export const getMyApps = () =>
  GET<V1Deployment & V1StatefulSet[]>('/api/getApps').then((res) => res.map(adaptAppListItem));

export const delAppByName = (name: string) => DELETE('/api/delApp', { name });

export const getAppByName = (name: string) =>
  GET(`/api/getAppByAppName?appName=${name}`).then(adaptAppDetail);

export const getAppPodsByAppName = (name: string) =>
  GET<V1Pod[]>('/api/getAppPodsByAppName', { name }).then((item) => item.map(adaptPod));

export const getPodsMetrics = (podsName: string[]) =>
  POST<SinglePodMetrics[]>('/api/getPodsMetrics', { podsName }).then((item) =>
    item.map(adaptMetrics)
  );

export const getPodLogs = (data: { podName: string; pageNum: number; pageSize?: number }) =>
  GET<string>(`/api/getPodLogs?${obj2Query(data)}`);

export const getPodEvents = (podName: string) =>
  GET(`/api/getPodEvents?podName=${podName}`).then(adaptEvents);

export const restartAppByName = (appName: string) => GET(`/api/restartApp?appName=${appName}`);

export const pauseAppByName = (appName: string) => GET(`/api/pauseApp?appName=${appName}`);

export const startAppByName = (appName: string) => GET(`/api/startApp?appName=${appName}`);

export const restartPodByName = (podName: string) => GET(`/api/restartPod?podName=${podName}`);
