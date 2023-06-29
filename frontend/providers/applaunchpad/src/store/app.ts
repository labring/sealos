import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { AppListItemType, AppDetailType, PodDetailType } from '@/types/app';
import { getMyApps, getAppPodsByAppName, getAppByName, getPodsMetrics } from '@/api/app';
import { appStatusMap, PodStatusEnum } from '@/constants/app';
import { MOCK_APP_DETAIL, MOCK_APPS } from '@/mock/apps';

type State = {
  appList: AppListItemType[];
  setAppList: () => Promise<AppListItemType[]>;
  appDetail?: AppDetailType;
  appDetailPods: PodDetailType[];
  setAppDetail: (appName: string) => Promise<AppDetailType>;
  intervalLoadPods: (appName: string) => Promise<string>;
};

export const useAppStore = create<State>()(
  devtools(
    immer((set, get) => ({
      appList: [],
      appDetail: MOCK_APP_DETAIL,
      appDetailPods: [],
      setAppList: async () => {
        const res = await getMyApps();
        set((state) => {
          state.appList = res;
        });
        return res;
      },
      setAppDetail: async (appName: string) => {
        set((state) => {
          state.appDetail = undefined;
          state.appDetailPods = [];
        });
        const res = await getAppByName(appName);
        set((state) => {
          state.appDetail = res;
        });
        return res;
      },
      intervalLoadPods: async (appName: string) => {
        if (!appName) return Promise.reject('app name is empty');
        // get pod and update
        const pods = await getAppPodsByAppName(appName);

        // one pod running, app is running
        const appStatus =
          pods.filter((pod) => pod.status.value === PodStatusEnum.running).length > 0
            ? appStatusMap.running
            : appStatusMap.waiting;

        set((state) => {
          // update pods info except cpu and memory
          state.appDetailPods = pods.map((pod) => {
            const oldPod = state.appDetailPods.find((item) => item.podName === pod.podName);

            return {
              ...pod,
              usedCpu: oldPod ? oldPod.usedCpu : pod.usedCpu,
              usedMemory: oldPod ? oldPod.usedMemory : pod.usedMemory
            };
          });

          // update app status
          if (state?.appDetail?.appName === appName) {
            state.appDetail.status = appStatus;
          }
          state.appList = state.appList.map((item) => ({
            ...item,
            status: item.name === appName ? appStatus : item.status
          }));
        });

        // ============================================

        // get metrics and update
        getPodsMetrics(pods.map((pod) => pod.podName))
          .then((metrics) => {
            set((state) => {
              // update pod cpu and memory
              state.appDetailPods = state.appDetailPods.map((pod) => {
                const currentCpu = metrics.find((item) => item.podName === pod.podName)?.cpu || 0;
                const currentMemory =
                  metrics.find((item) => item.podName === pod.podName)?.memory || 0;

                return {
                  ...pod,
                  usedCpu: [...pod.usedCpu.slice(1), currentCpu],
                  usedMemory: [...pod.usedMemory.slice(1), currentMemory]
                };
              });

              const aveCpu = Number(
                metrics.reduce((sum, item) => sum + item.cpu / metrics.length, 0).toFixed(4)
              );
              const aveMemory = Number(
                metrics.reduce((sum, item) => sum + item.memory / metrics.length, 0).toFixed(4)
              );

              // update detailApp average cpu and memory
              if (state?.appDetail?.appName === appName) {
                state.appDetail.usedCpu = [...state.appDetail.usedCpu.slice(1), aveCpu];
                state.appDetail.usedMemory = [...state.appDetail.usedMemory.slice(1), aveMemory];
              }

              //  update appList
              state.appList = state.appList.map((item) => ({
                ...item,
                usedCpu: item.name === appName ? [...item.usedCpu.slice(1), aveCpu] : item.usedCpu,
                useMemory:
                  item.name === appName ? [...item.useMemory.slice(1), aveMemory] : item.useMemory
              }));
            });
          })
          .catch((err) => {
            console.error(err, 'get metrics error');
          });

        return 'finish';
      }
    }))
  )
);
