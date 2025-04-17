import { GET, POST, DELETE } from '@/services/request';
import type { V1Deployment, V1Pod, SinglePodMetrics, V1StatefulSet } from '@kubernetes/client-node';
import {
  adaptAppListItem,
  adaptPod,
  adaptAppDetail,
  adaptMetrics,
  adaptEvents
} from '@/utils/adapt';
import type { AppPatchPropsType, PodDetailType } from '@/types/app';
import { MonitorDataResult, MonitorQueryKey } from '@/types/monitor';
import { LogQueryPayload } from '@/pages/api/log/queryLogs';
import { PodListQueryPayload } from '@/pages/api/log/queryPodList';

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
  GET<PodDetailType[]>('/api/getAppPodsByAppName', { name });

export const getPodsMetrics = (podsName: string[]) =>
  POST<SinglePodMetrics[]>('/api/getPodsMetrics', { podsName }).then((item) =>
    item.map(adaptMetrics)
  );

export const getPodLogs = (data: {
  appName: string;
  podName: string;
  stream: boolean;
  logSize?: number;
  sinceTime?: number;
  previous?: boolean;
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
  start?: number;
  end?: number;
}) => GET<MonitorDataResult[]>(`/api/monitor/getMonitorData`, payload);

export const getAppLogs = (payload: LogQueryPayload) => POST<string>('/api/log/queryLogs', payload);

export const getLogPodList = (payload: PodListQueryPayload) =>
  POST<string[]>('/api/log/queryPodList', payload);
