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
import { devboxStatusMap, PodStatusEnum } from '@/constants/devbox';
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
  };
  setStartedTemplate: (
    template:
      | {
          uid: string;
          iconId: string | null;
          name: string;
        }
      | undefined
  ) => void;
  setDevboxVersionList: (
    devboxName: string,
    devboxUid: string
  ) => Promise<DevboxVersionListItemType[]>;
  devboxDetail?: DevboxDetailTypeV2;
  setDevboxDetail: (devboxName: string, sealosDomain: string) => Promise<DevboxDetailTypeV2>;
  intervalLoadPods: (devboxName: string, updateDetail: boolean) => Promise<any>;
  loadDetailMonitorData: (devboxName: string) => Promise<any>;
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
          state.devboxList = state.devboxList.map((item) => ({
            ...item,
            usedCpu:
              item.name === devboxName && averageCpuData[0] ? averageCpuData[0] : item.usedCpu,
            usedMemory:
              item.name === devboxName && averageMemoryData[0]
                ? averageMemoryData[0]
                : item.usedMemory
          }));
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
              name: templateRepository.name
            };
        });
      },
      startedTemplate: undefined,
      devboxDetail: undefined,
      setDevboxDetail: async (devboxName: string, sealosDomain: string) => {
        const detail = await getDevboxByName(devboxName);

        if (detail.status.value !== 'Running') {
          set((state) => {
            state.devboxDetail = detail;
          });
          return detail;
        }
        const pods = await getDevboxPodsByDevboxName(devboxName);

        const { base64PrivateKey, userName } = await getSSHConnectionInfo({
          devboxName: detail.name
        });

        const sshPrivateKey = Buffer.from(base64PrivateKey, 'base64').toString('utf-8');
        const sshConfig = {
          sshUser: userName,
          sshDomain: sealosDomain,
          sshPort: detail.sshPort,
          sshPrivateKey
        };

        // add sshConfig
        detail.sshConfig = sshConfig as DevboxDetailType['sshConfig'];

        // add upTime by Pod
        detail.upTime = pods[0].upTime;

        set((state) => {
          state.devboxDetail = detail;
        });

        return detail;
      },
      intervalLoadPods: async (devboxName, updateDetail) => {
        if (!devboxName) return Promise.reject('devbox name is empty');

        const pods = await getDevboxPodsByDevboxName(devboxName);

        // TODO: change Running to podStatusMap.running
        // TODO: check status enum and backend status enum
        const devboxStatus =
          pods.length === 0
            ? devboxStatusMap.Stopped
            : pods.filter((pod) => pod.status.value === PodStatusEnum.running).length > 0
            ? devboxStatusMap.Running
            : devboxStatusMap.Pending;

        set((state) => {
          if (state?.devboxDetail?.name === devboxName && updateDetail) {
            state.devboxDetail.status = devboxStatus;
          }
          state.devboxList = state.devboxList.map((item) => ({
            ...item,
            status: item.name === devboxName ? devboxStatus : item.status
          }));
        });
        return 'success';
      },
      loadDetailMonitorData: async (devboxName) => {
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
