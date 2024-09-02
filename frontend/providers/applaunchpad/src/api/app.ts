import { GET, POST, DELETE } from '@/services/request';
import type { V1Deployment, V1Pod, SinglePodMetrics, V1StatefulSet } from '@kubernetes/client-node';
import {
  adaptAppListItem,
  adaptPod,
  adaptAppDetail,
  adaptMetrics,
  adaptEvents,
  sortAppListByTime
} from '@/utils/adapt';
import type { AppPatchPropsType } from '@/types/app';
import { MonitorDataResult, MonitorQueryKey } from '@/types/monitor';
import { ExportAppPayload } from '@/pages/api/exportApp';
import { NodeInfo } from '@/pages/api/getNodes';

export const getNamespaces = () => GET('/api/getNamespaces');

export const getNodes = () => GET<NodeInfo[]>('/api/getNodes');

export const getImages = () => GET<{ repositories: string[] }>('/api/getImages');

export const getImageTags = (data: { repository: string }) =>
  GET<{ name: string; tags: string[] }>('/api/getImages', data);

export const postDeployApp = (namespace: string, yamlList: string[]) =>
  POST(`/api/applyApp?namespace=${namespace}`, { yamlList });

export const putApp = (
  namespace: string,
  data: {
    patch: AppPatchPropsType;
    appName: string;
    stateFulSetYaml?: string;
  }
) => POST(`/api/updateApp?namespace=${namespace}`, data);

export const getMyApps = (namespace: string) =>
  //GET<V1Deployment & V1StatefulSet[]>('/api/getApps').then((res) => res.map(adaptAppListItem));
  GET<V1Deployment & V1StatefulSet[]>(`/api/getApps?namespace=${namespace}`)
    .then((res) => res.map(adaptAppListItem))
    .then(sortAppListByTime);

export const delAppByName = (namespace: string, name: string) =>
  DELETE(`/api/delApp?namespace=${namespace}`, { name });

export const getAppByName = (namespace: string, name: string) =>
  GET(`/api/getAppByAppName?namespace=${namespace}&&appName=${name}`).then(adaptAppDetail);

export const getAppPodsByAppName = (namespace: string, name: string) =>
  GET<V1Pod[]>(`/api/getAppPodsByAppName?namespace=${namespace}`, { name }).then((item) =>
    item.map(adaptPod)
  );

export const getPodsMetrics = (namespace: string, podsName: string[]) =>
  POST<SinglePodMetrics[]>(`/api/getPodsMetrics?namespace=${namespace}`, { podsName }).then(
    (item) => item.map(adaptMetrics)
  );

export const getPodLogs = (
  namespace: string,
  data: {
    appName: string;
    podName: string;
    stream: boolean;
    logSize?: number;
    containerName: string;
  }
) => POST<string>(`/api/getPodLogs?namespace=${namespace}`, data);

export const getPodEvents = (namespace: string, podName: string) =>
  GET(`/api/getPodEvents?namespace=${namespace}&&podName=${podName}`).then(adaptEvents);

export const restartAppByName = (namespace: string, appName: string) =>
  GET(`/api/restartApp?namespace=${namespace}&&appName=${appName}`);

export const pauseAppByName = (namespace: string, appName: string) =>
  GET(`/api/pauseApp?namespace=${namespace}&&appName=${appName}`);

export const startAppByName = (namespace: string, appName: string) =>
  GET(`/api/startApp?namespace=${namespace}&&appName=${appName}`);

export const restartPodByName = (namespace: string, podName: string) =>
  GET(`/api/restartPod?namespace=${namespace}&&podName=${podName}`);

export const getAppMonitorData = (
  namespace: string,
  payload: {
    queryName: string;
    queryKey: keyof MonitorQueryKey;
    step: string;
  }
) => GET<MonitorDataResult[]>(`/api/monitor/getMonitorData?namespace=${namespace}`, payload);

export const exportApp = (data: ExportAppPayload) =>
  POST<{
    downloadPath: string;
    error?: string;
  }>(`/api/exportApp`, data);
