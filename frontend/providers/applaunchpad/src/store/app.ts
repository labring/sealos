import {
  getAppByName,
  getAppMonitorData,
  getAppPodsByAppName,
  getMyApps,
  getNamespaces
} from '@/api/app';
import { PodStatusEnum, appStatusMap } from '@/constants/app';
import { MOCK_APP_DETAIL } from '@/mock/apps';
import type { AppDetailType, AppListItemType, PodDetailType } from '@/types/app';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type State = {
  namespaces: string[];
  appList: AppListItemType[];
  setAppList: (namespace: string, init?: boolean) => Promise<AppListItemType[]>;
  appDetail?: AppDetailType;
  appDetailPods: PodDetailType[];
  setAppDetail: (namespace: string, appName: string) => Promise<AppDetailType>;
  intervalLoadPods: (namespace: string, appName: string, updateDetail: boolean) => Promise<any>;
  loadAvgMonitorData: (namespace: string, appName: string) => Promise<any>;
  loadDetailMonitorData: (namespace: string, appName: string) => Promise<any>;
};

export const useAppStore = create<State>()(
  devtools(
    immer((set, get) => ({
      appList: [] as AppListItemType[],
      appDetail: MOCK_APP_DETAIL,
      appDetailPods: [] as PodDetailType[],
      namespaces: ['default'] as string[],
      setAppList: async (namespace, init = false) => {
        console.log('get namespaces');
        const namespaces = await getNamespaces();
        console.log('namespaces222:', namespaces);
        set((state) => {
          state.namespaces = namespaces;
        });
        const res = await getMyApps(namespace);
        set((state) => {
          state.appList = res;
        });
        return res;
      },
      setAppDetail: async (namespace, appName: string) => {
        set((state) => {
          state.appDetail = {
            ...MOCK_APP_DETAIL,
            appName
          };
          state.appDetailPods = [];
        });
        const res = await getAppByName(namespace, appName);
        set((state) => {
          state.appDetail = res;
        });
        return res;
      },
      // updata applist appdetail status
      intervalLoadPods: async (namespace, appName, updateDetail) => {
        if (!appName) return Promise.reject('app name is empty');
        const pods = await getAppPodsByAppName(namespace, appName);

        // one pod running, app is running
        const appStatus =
          pods.filter((pod) => pod.status.value === PodStatusEnum.running).length > 0
            ? appStatusMap.running
            : appStatusMap.creating;

        set((state) => {
          if (state?.appDetail?.appName === appName && updateDetail) {
            state.appDetail.status = appStatus;
            state.appDetailPods = pods.map((pod) => {
              const oldPod = state.appDetailPods.find((item) => item.podName === pod.podName);
              return {
                ...pod,
                usedCpu: oldPod ? oldPod.usedCpu : pod.usedCpu,
                usedMemory: oldPod ? oldPod.usedMemory : pod.usedMemory
              };
            });
          }
          state.appList = state.appList.map((item) => ({
            ...item,
            status: item.name === appName ? appStatus : item.status
          }));
        });
        return 'success';
      },
      loadAvgMonitorData: async (namespace, appName) => {
        const pods = await getAppPodsByAppName(namespace, appName);
        const queryName = pods[0].podName || appName;
        const [averageCpu, averageMemory] = await Promise.all([
          getAppMonitorData(namespace, {
            queryKey: 'average_cpu',
            queryName: queryName,
            step: '2m'
          }),
          getAppMonitorData(namespace, {
            queryKey: 'average_memory',
            queryName: queryName,
            step: '2m'
          })
        ]);
        set((state) => {
          state.appList = state.appList.map((item) => ({
            ...item,
            usedCpu: item.name === appName && averageCpu[0] ? averageCpu[0] : item.usedCpu,
            usedMemory:
              item.name === appName && averageMemory[0] ? averageMemory[0] : item.usedMemory
          }));
        });
      },
      loadDetailMonitorData: async (namespace, appName) => {
        const pods = await getAppPodsByAppName(namespace, appName);

        const queryName = pods[0].podName || appName;

        set((state) => {
          state.appDetailPods = pods.map((pod) => {
            const oldPod = state.appDetailPods.find((item) => item.podName === pod.podName);
            return {
              ...pod,
              usedCpu: oldPod ? oldPod.usedCpu : pod.usedCpu,
              usedMemory: oldPod ? oldPod.usedMemory : pod.usedMemory
            };
          });
        });

        const [cpuData, memoryData, averageCpuData, averageMemoryData] = await Promise.all([
          getAppMonitorData(namespace, { queryKey: 'cpu', queryName: queryName, step: '2m' }),
          getAppMonitorData(namespace, { queryKey: 'memory', queryName: queryName, step: '2m' }),
          getAppMonitorData(namespace, {
            queryKey: 'average_cpu',
            queryName: queryName,
            step: '2m'
          }),
          getAppMonitorData(namespace, {
            queryKey: 'average_memory',
            queryName: queryName,
            step: '2m'
          })
        ]);

        set((state) => {
          if (state?.appDetail?.appName === appName && state.appDetail?.isPause !== true) {
            state.appDetail.usedCpu = averageCpuData?.[0]
              ? averageCpuData[0]
              : { xData: new Array(30).fill(0), yData: new Array(30).fill('0'), name: '' };
            state.appDetail.usedMemory = averageMemoryData?.[0]
              ? averageMemoryData[0]
              : { xData: new Array(30).fill(0), yData: new Array(30).fill('0'), name: '' };
          }
          state.appDetailPods = pods.map((pod) => {
            const currentCpu = cpuData?.find((item) => item.name === pod.podName);
            const currentMemory = memoryData?.find((item) => item.name === pod.podName);
            return {
              ...pod,
              usedCpu: currentCpu ? currentCpu : pod.usedCpu,
              usedMemory: currentMemory ? currentMemory : pod.usedMemory
            };
          });
        });
        return 'success';
      }
    }))
  )
);
