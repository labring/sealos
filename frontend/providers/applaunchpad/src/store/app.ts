import { getAppByName, getAppMonitorData, getAppPodsByAppName, getMyApps } from '@/api/app';
import { PodStatusEnum, appStatusMap } from '@/constants/app';
import { MOCK_APP_DETAIL } from '@/mock/apps';
import type { AppDetailType, AppListItemType, PodDetailType } from '@/types/app';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type State = {
  appList: AppListItemType[];
  setAppList: (init?: boolean) => Promise<AppListItemType[]>;
  appDetail?: AppDetailType;
  appDetailPods: PodDetailType[];
  setAppDetail: (appName: string) => Promise<AppDetailType>;
  intervalLoadPods: (appName: string, updateDetail: boolean) => Promise<any>;
  loadAvgMonitorData: (appName: string) => Promise<any>;
  loadDetailMonitorData: (appName: string) => Promise<any>;
};

export const useAppStore = create<State>()(
  devtools(
    immer((set, get) => ({
      appList: [] as AppListItemType[],
      appDetail: MOCK_APP_DETAIL,
      appDetailPods: [] as PodDetailType[],
      setAppList: async (init = false) => {
        const res = await getMyApps();
        set((state) => {
          state.appList = res;
        });
        return res;
      },
      setAppDetail: async (appName: string) => {
        set((state) => {
          state.appDetail = {
            ...MOCK_APP_DETAIL,
            appName
          };
          state.appDetailPods = [];
        });
        const res = await getAppByName(appName);
        set((state) => {
          state.appDetail = res;
        });
        return res;
      },
      // updata applist appdetail status
      intervalLoadPods: async (appName, updateDetail) => {
        if (!appName) return Promise.reject('app name is empty');
        const pods = await getAppPodsByAppName(appName);

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
      loadAvgMonitorData: async (appName) => {
        const pods = await getAppPodsByAppName(appName);
        const queryName = pods[0].podName || appName;
        const [averageCpu, averageMemory] = await Promise.all([
          getAppMonitorData({
            queryKey: 'average_cpu',
            queryName: queryName,
            step: '2m'
          }),
          getAppMonitorData({
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
      loadDetailMonitorData: async (appName) => {
        const pods = await getAppPodsByAppName(appName);
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
          getAppMonitorData({ queryKey: 'cpu', queryName: queryName, step: '2m' }),
          getAppMonitorData({ queryKey: 'memory', queryName: queryName, step: '2m' }),
          getAppMonitorData({ queryKey: 'average_cpu', queryName: queryName, step: '2m' }),
          getAppMonitorData({ queryKey: 'average_memory', queryName: queryName, step: '2m' })
        ]);

        set((state) => {
          if (state?.appDetail?.appName === appName && state.appDetail?.isPause !== true) {
            state.appDetail.usedCpu = averageCpuData[0]
              ? averageCpuData[0]
              : { xData: new Array(30).fill(0), yData: new Array(30).fill('0'), name: '' };
            state.appDetail.usedMemory = averageMemoryData[0]
              ? averageMemoryData[0]
              : { xData: new Array(30).fill(0), yData: new Array(30).fill('0'), name: '' };
          }
          state.appDetailPods = pods.map((pod) => {
            const currentCpu = cpuData.find((item) => item.name === pod.podName);
            const currentMemory = memoryData.find((item) => item.name === pod.podName);
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
