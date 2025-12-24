import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import {
  getDevboxByName,
  getDevboxMonitorData,
  getDevboxPodsByDevboxName,
  getDevboxVersionList,
  getMyDevboxList,
  getSSHConnectionInfo
} from '@/api/devbox';
import type {
  DevboxDetailType,
  DevboxDetailTypeV2,
  DevboxListItemTypeV2,
  DevboxVersionListItemType
} from '@/types/devbox';

type State = {
  devboxList: DevboxListItemTypeV2[];
  requestCache: Map<string, Promise<any>>;
  setDevboxList: () => Promise<DevboxListItemTypeV2[]>;
  loadAvgMonitorData: (devboxName: string) => Promise<void>;
  devboxVersionList: DevboxVersionListItemType[];
  startedTemplate?: {
    uid: string;
    iconId: string | null;
    name: string;
    templateUid?: string;
    description?: string | null;
  };
  setStartedTemplate: (
    template:
      | {
          uid: string;
          iconId: string | null;
          name: string;
          templateUid?: string;
          description?: string | null;
        }
      | undefined
  ) => void;
  setDevboxVersionList: (
    devboxName: string,
    devboxUid: string
  ) => Promise<DevboxVersionListItemType[]>;
  devboxDetail?: DevboxDetailTypeV2;
  setDevboxDetail: (
    devboxName: string,
    sealosDomain: string,
    mock?: boolean
  ) => Promise<DevboxDetailTypeV2>;
  intervalLoadPods: (devboxName: string, updateDetail: boolean) => Promise<any>;
  loadDetailMonitorData: (devboxName: string, start?: number, end?: number) => Promise<any>;
};

export const useDevboxStore = create<State>()(
  devtools(
    immer((set, get) => ({
      devboxList: [],
      requestCache: new Map(),
      setDevboxList: async () => {
        const res = await getMyDevboxList();
        set((state) => {
          state.devboxList = res;
        });
        return res;
      },
      loadAvgMonitorData: async (devboxName) => {
        const pods = await getDevboxPodsByDevboxName(devboxName);
        const queryName = pods.length > 0 ? pods[0].podName : devboxName;

        const [averageCpuData, averageMemoryData] = await Promise.all([
          getDevboxMonitorData({
            queryKey: 'average_cpu',
            queryName: queryName,
            step: '2m'
          }),
          getDevboxMonitorData({
            queryKey: 'average_memory',
            queryName: queryName,
            step: '2m'
          })
        ]);
        set((state) => {
          const targetIndex = state.devboxList.findIndex((item) => item.name === devboxName);
          if (targetIndex !== -1) {
            const item = state.devboxList[targetIndex];
            if (averageCpuData[0]) {
              item.usedCpu = averageCpuData[0];
            }
            if (averageMemoryData[0]) {
              item.usedMemory = averageMemoryData[0];
            }
          }
        });
      },
      devboxVersionList: [],
      setDevboxVersionList: async (devboxName, devboxUid) => {
        const res = await getDevboxVersionList(devboxName, devboxUid);

        set((state) => {
          state.devboxVersionList = res;
        });
        return res;
      },
      setStartedTemplate(templateRepository) {
        set((state) => {
          if (!templateRepository) state.startedTemplate = undefined;
          else
            state.startedTemplate = {
              uid: templateRepository.uid,
              iconId: templateRepository.iconId,
              name: templateRepository.name,
              templateUid: templateRepository.templateUid,
              description: templateRepository.description
            };
        });
      },
      startedTemplate: undefined,
      devboxDetail: undefined,
      setDevboxDetail: async (devboxName: string, sealosDomain: string, mock?: boolean) => {
        const detail = await getDevboxByName(devboxName, mock);
        if (mock) {
          set((state) => {
            state.devboxDetail = detail;
          });
        }

        // SSH configuration should be obtained regardless of whether it is running on or not
        const { base64PrivateKey, userName, token } = await getSSHConnectionInfo({
          devboxName: detail.name
        });

        const sshPrivateKey = Buffer.from(base64PrivateKey, 'base64').toString('utf-8');
        const sshConfig = {
          sshUser: userName,
          sshDomain: sealosDomain,
          sshPort: detail.sshPort,
          sshPrivateKey,
          token
        };

        detail.sshConfig = sshConfig as DevboxDetailType['sshConfig'];

        if (detail.status.value !== 'Running') {
          set((state) => {
            state.devboxDetail = detail;
          });
          return detail;
        }
        const pods = await getDevboxPodsByDevboxName(devboxName);

        // add upTime by Pod
        detail.upTime = pods[0].upTime;

        set((state) => {
          state.devboxDetail = detail;
        });

        return detail;
      },
      intervalLoadPods: async (devboxName, updateDetail) => {
        if (!devboxName) return Promise.reject('devbox name is empty');

        const res = await getMyDevboxList();
        const sshPort = res.find((item: DevboxListItemTypeV2) => item.name === devboxName)?.sshPort;
        const status = res.find((item: DevboxListItemTypeV2) => item.name === devboxName)?.status;

        if (!status) return Promise.reject('devbox status is empty');

        const isPause = status.value === 'Stopped' || status.value === 'Shutdown';

        set((state) => {
          if (state?.devboxDetail?.name === devboxName && updateDetail) {
            state.devboxDetail.status = status;
            state.devboxDetail.isPause = isPause;
            if (state.devboxDetail.sshConfig && sshPort) {
              state.devboxDetail.sshConfig.sshPort = sshPort;
            }
          }
          const targetIndex = state.devboxList.findIndex((item) => item.name === devboxName);
          if (targetIndex !== -1) {
            state.devboxList[targetIndex].status = status;
          }
        });
        return 'success';
      },
      loadDetailMonitorData: async (devboxName, start, end) => {
        const pods = await getDevboxPodsByDevboxName(devboxName);

        const queryName = pods.length > 0 ? pods[0].podName : devboxName;

        const [averageCpuData, averageMemoryData] = await Promise.all([
          getDevboxMonitorData({
            queryKey: 'average_cpu',
            queryName: queryName,
            step: '2m',
            start,
            end
          }),
          getDevboxMonitorData({
            queryKey: 'average_memory',
            queryName: queryName,
            step: '2m',
            start,
            end
          })
        ]);

        set((state) => {
          if (state?.devboxDetail?.name === devboxName && state.devboxDetail?.isPause !== true) {
            state.devboxDetail.usedCpu = averageCpuData[0]
              ? averageCpuData[0]
              : {
                  xData: new Array(30).fill(0),
                  yData: new Array(30).fill('0'),
                  name: ''
                };
            state.devboxDetail.usedMemory = averageMemoryData[0]
              ? averageMemoryData[0]
              : {
                  xData: new Array(30).fill(0),
                  yData: new Array(30).fill('0'),
                  name: ''
                };
          }
        });
        return 'success';
      }
    }))
  )
);
