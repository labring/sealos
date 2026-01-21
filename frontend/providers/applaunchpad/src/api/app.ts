import { GET, POST, DELETE } from '@/services/request';
import type { V1Deployment, SinglePodMetrics, V1StatefulSet } from '@kubernetes/client-node';
import { adaptAppListItem, adaptMetrics, adaptEvents } from '@/utils/adapt';
import type { AppDetailType, AppPatchPropsType, PodDetailType } from '@/types/app';
import { MonitorDataResult, MonitorQueryKey } from '@/types/monitor';
import { LogQueryPayload } from '@/pages/api/log/queryLogs';
import { PodListQueryPayload } from '@/pages/api/log/queryPodList';
import { track } from '@sealos/gtm';

export const postDeployApp = (yamlList: string[], mode: 'create' | 'replace' = 'create') =>
  POST('/api/applyApp', { yamlList, mode });

export const putApp = (data: {
  patch: AppPatchPropsType;
  appName: string;
  stateFulSetYaml?: string;
}) => {
  track('deployment_update', {
    module: 'applaunchpad'
  });

  return POST('/api/updateApp', data);
};

export const getMyApps = () =>
  GET<V1Deployment & V1StatefulSet[]>('/api/getApps').then((res) => res.map(adaptAppListItem));

export const delAppByName = (name: string) => {
  track('deployment_delete', {
    module: 'applaunchpad'
  });

  return DELETE('/api/delApp', { name });
};

export const getAppByName = (name: string, mock = false) =>
  GET<AppDetailType>(`/api/getAppByAppName?appName=${name}&mock=${mock}`);

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

export const restartAppByName = (appName: string) => {
  track('deployment_restart', {
    module: 'applaunchpad'
  });

  return GET(`/api/restartApp?appName=${appName}`);
};

export const pauseAppByName = (appName: string) => {
  track('deployment_shutdown', {
    module: 'applaunchpad',
    type: 'normal'
  });

  return GET(`/api/pauseApp?appName=${appName}`);
};

export const startAppByName = (appName: string) => {
  track('deployment_start', {
    module: 'applaunchpad'
  });

  return GET(`/api/startApp?appName=${appName}`);
};

export const restartPodByName = (podName: string) => GET(`/api/restartPod?podName=${podName}`);

// ========== 旧版监控数据 API (GET 请求) ==========
// export const getAppMonitorData = (payload: {
//   queryName: string;
//   queryKey: keyof MonitorQueryKey;
//   step: string;
//   start?: number;
//   end?: number;
//   pvcName?: string;
// }) => GET<MonitorDataResult[]>(`/api/monitor/getMonitorData`, payload);

// ========== 新版监控数据 API V2 ==========
interface MonitorApiResponseV2 {
  result: MonitorDataResult[];
  debug?: {
    requestParams?: any;
    rawResponse?: any;
    adaptedData?: any;
    finalResult?: any;
  };
}

export const getAppMonitorData = async (payload: {
  queryName: string;
  queryKey: keyof MonitorQueryKey;
  step: string;
  start?: number;
  end?: number;
  pvcName?: string;
}): Promise<MonitorDataResult[]> => {
  // 调试用
  // console.log('==================== [DEBUG] Monitor API V2 ====================');
  // console.log('[DEBUG] 1. Frontend Request Payload:', payload);

  try {
    const response = await GET<MonitorApiResponseV2>(`/api/monitor/getMonitorDataV2`, payload);

    // 调试用
    // console.log('[DEBUG] 2. Raw Response:', response);

    // 打印后端返回的 debug 信息
    if (response && typeof response === 'object' && 'result' in response) {
      const { debug, result } = response as MonitorApiResponseV2;
      if (debug) {
        // console.log('[DEBUG] 3. Backend Request Params:', debug.requestParams);
        // console.log('[DEBUG] 4. VictoriaMetrics Raw Response:', debug.rawResponse);
        // console.log('[DEBUG] 5. Adapted Data:', debug.adaptedData);
        // console.log('[DEBUG] 6. Final Result:', debug.finalResult);
      }
      // console.log('================================================================');
      return result || [];
    }

    // 兼容旧格式 (直接返回数组)
    if (Array.isArray(response)) {
      // console.log('[DEBUG] Response is array (legacy format)');
      // console.log('================================================================');
      return response;
    }

    // console.log('[DEBUG] Unexpected response format:', typeof response);
    // console.log('================================================================');
    return [];
  } catch (error) {
    // console.error('[DEBUG] Error fetching monitor data:', error);
    // console.log('================================================================');
    return [];
  }
};

export const getAppLogs = (payload: LogQueryPayload) => POST<string>('/api/log/queryLogs', payload);

export const getLogPodList = (payload: PodListQueryPayload) =>
  POST<string[]>('/api/log/queryPodList', payload);

export const setAppRemark = (payload: {
  appName: string;
  remark: string;
  kind: 'deployment' | 'statefulset';
}) => POST('/api/remark', payload);
