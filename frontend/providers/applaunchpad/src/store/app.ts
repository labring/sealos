import { getAppByName, getAppMonitorData, getAppPodsByAppName, getMyApps } from '@/api/app';
import { PodStatusEnum, appStatusMap } from '@/constants/app';
import { EMPTY_MONITOR_DATA } from '@/constants/monitor';
import { MOCK_APP_DETAIL } from '@/mock/apps';
import type { AppDetailType, AppListItemType, PodDetailType, AppStatusMapType } from '@/types/app';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

const getStatusFromPods = (
  pods: PodDetailType[],
  currentStatus: AppStatusMapType = appStatusMap.waiting
): AppStatusMapType => {
  const runningCount = pods.filter((pod) => pod.status.value === PodStatusEnum.running).length;
  const terminatedCount = pods.filter(
    (pod) => pod.status.value === PodStatusEnum.terminated
  ).length;
  const allTerminated = pods.length > 0 && terminatedCount === pods.length;

  if (runningCount > 0) return appStatusMap.running;
  if (allTerminated) return appStatusMap.error;
  if (pods.length > 0) return appStatusMap.creating;

  return currentStatus;
};

type State = {
  appList: AppListItemType[];
  setAppList: (init?: boolean) => Promise<AppListItemType[]>;
  appDetail?: AppDetailType;
  appDetailPods: PodDetailType[];
  setAppDetail: (appName: string, mock?: boolean) => Promise<AppDetailType>;
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
      setAppDetail: async (appName: string, mock = false) => {
        const currentAppName = get().appDetail?.appName;
        // Only reset pods when switching to a different app
        const shouldResetPods = currentAppName !== appName;

        set((state) => {
          state.appDetail = {
            ...MOCK_APP_DETAIL,
            appName
          };
          if (shouldResetPods) {
            state.appDetailPods = [];
          }
        });
        const res = await getAppByName(appName, mock);
        set((state) => {
          state.appDetail = res;
        });
        return res;
      },
      // updata applist appdetail status
      intervalLoadPods: async (appName, updateDetail) => {
        if (!appName) return Promise.reject('app name is empty');
        const pods = await getAppPodsByAppName(appName);

        set((state) => {
          const currentAppDetailStatus =
            state?.appDetail?.appName === appName ? state.appDetail.status : undefined;
          const currentAppListStatus = state.appList.find((item) => item.name === appName)?.status;
          const appStatus = getStatusFromPods(
            pods,
            currentAppDetailStatus || currentAppListStatus || appStatusMap.waiting
          );

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
        const queryName = pods?.[0]?.podName || appName;
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

        if (pods.length === 0) {
          set((state) => {
            state.appDetailPods = [];
            if (state?.appDetail?.appName === appName && state.appDetail?.isPause !== true) {
              state.appDetail.usedCpu = { ...EMPTY_MONITOR_DATA };
              state.appDetail.usedMemory = { ...EMPTY_MONITOR_DATA };
            }
          });
          return 'success';
        }

        const queryName = pods[0].podName;

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
              : { ...EMPTY_MONITOR_DATA };
            state.appDetail.usedMemory = averageMemoryData[0]
              ? averageMemoryData[0]
              : { ...EMPTY_MONITOR_DATA };
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
