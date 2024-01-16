import { GET, POST, DELETE } from '@/services/request';
import type { V1Deployment, V1Pod, SinglePodMetrics, V1StatefulSet } from '@kubernetes/client-node';
import {
  adaptAppListItem,
  adaptPod,
  adaptAppDetail,
  adaptMetrics,
  adaptEvents
} from '@/utils/adapt';
import type { AppPatchPropsType } from '@/types/app';
import { MonitorDataResult, MonitorQueryKey } from '@/types/monitor';

export const postDeployApp = (yamlList: string[]) => POST('/api/applyApp', { yamlList });

export const putApp = (data: {
  patch: AppPatchPropsType;
  appName: string;
  stateFulSetYaml?: string;
}) => POST('/api/updateApp', data);

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

export const getPodLogs = (data: {
  appName: string;
  podName: string;
  stream: boolean;
  logSize?: number;
}) => POST<string>(`/api/getPodLogs`, data);

export const getPodEvents = (podName: string) =>
  GET(`/api/getPodEvents?podName=${podName}`).then(adaptEvents);

export const restartAppByName = (appName: string) => GET(`/api/restartApp?appName=${appName}`);

export const pauseAppByName = (appName: string) => GET(`/api/pauseApp?appName=${appName}`);

export const startAppByName = (appName: string) => GET(`/api/startApp?appName=${appName}`);

export const restartPodByName = (podName: string) => GET(`/api/restartPod?podName=${podName}`);

export const getAppMonitorData = (payload: {
  queryName: string;
  queryKey: keyof MonitorQueryKey;
  step: string;
}) => GET<MonitorDataResult[]>(`/api/monitor/getMonitorData`, payload);
