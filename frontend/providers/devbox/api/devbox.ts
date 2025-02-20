import { V1Deployment, V1Pod, V1StatefulSet } from '@kubernetes/client-node';

import { DELETE, GET, POST } from '@/services/request';
import { GetDevboxByNameReturn } from '@/types/adapt';
import {
  DevboxEditTypeV2,
  DevboxListItemTypeV2,
  DevboxPatchPropsType,
  DevboxVersionListItemType
} from '@/types/devbox';
import { KBDevboxReleaseType, KBDevboxTypeV2 } from '@/types/k8s';
import {
  adaptAppListItem,
  adaptDevboxDetailV2,
  adaptDevboxListItemV2,
  adaptDevboxVersionListItem,
  adaptPod
} from '@/utils/adapt';
import { MonitorDataResult, MonitorQueryKey } from '@/types/monitor';
import { AxiosProgressEvent } from 'axios';

export const getMyDevboxList = () =>
  GET<
    [
      KBDevboxTypeV2,
      {
        templateRepository: {
          iconId: string | null;
        };
        uid: string;
      }
    ][]
  >('/api/getDevboxList').then((data): DevboxListItemTypeV2[] =>
    data.map(adaptDevboxListItemV2).sort((a, b) => {
      return new Date(b.createTime).getTime() - new Date(a.createTime).getTime();
    })
  );
export const getDevboxByName = (devboxName: string) =>
  GET<GetDevboxByNameReturn>('/api/getDevboxByName', { devboxName }).then(adaptDevboxDetailV2);

export const applyYamlList = (yamlList: string[], type: 'create' | 'replace' | 'update') =>
  POST('/api/applyYamlList', { yamlList, type });

export const createDevbox = (payload: { devboxForm: DevboxEditTypeV2 }) =>
  POST(`/api/createDevbox`, payload);

export const updateDevbox = (payload: { patch: DevboxPatchPropsType; devboxName: string }) =>
  POST(`/api/updateDevbox`, payload);

export const delDevbox = (devboxName: string) => DELETE('/api/delDevbox', { devboxName });

export const restartDevbox = (data: { devboxName: string }) => POST('/api/restartDevbox', data);

export const startDevbox = (data: { devboxName: string }) => POST('/api/startDevbox', data);

export const pauseDevbox = (data: { devboxName: string }) => POST('/api/pauseDevbox', data);

export const getDevboxVersionList = (devboxName: string, devboxUid: string) =>
  GET<KBDevboxReleaseType[]>('/api/getDevboxVersionList', { devboxName, devboxUid }).then(
    (data): DevboxVersionListItemType[] =>
      data.map(adaptDevboxVersionListItem).sort((a, b) => {
        return new Date(b.createTime).getTime() - new Date(a.createTime).getTime();
      })
  );

export const releaseDevbox = (data: {
  devboxName: string;
  tag: string;
  releaseDes: string;
  devboxUid: string;
}) => POST('/api/releaseDevbox', data);

export const editDevboxVersion = (data: { name: string; releaseDes: string }) =>
  POST('/api/editDevboxVersion', data);

export const delDevboxVersionByName = (versionName: string) =>
  DELETE('/api/delDevboxVersionByName', { versionName });

export const getSSHConnectionInfo = (data: { devboxName: string }) =>
  GET<{
    base64PublicKey: string;
    base64PrivateKey: string;
    token: string;
    userName: string;
    workingDir: string;
    releaseCommand: string;
    releaseArgs: string;
  }>('/api/getSSHConnectionInfo', data);

export const getDevboxPodsByDevboxName = (name: string) =>
  GET<V1Pod[]>('/api/getDevboxPodsByDevboxName', { name }).then((item) => item.map(adaptPod));

export const getDevboxMonitorData = (payload: {
  queryName: string;
  queryKey: keyof MonitorQueryKey;
  step: string;
}) => GET<MonitorDataResult[]>(`/api/monitor/getMonitorData`, payload);

export const getAppsByDevboxId = (devboxId: string) =>
  GET<V1Deployment & V1StatefulSet[]>('/api/getAppsByDevboxId', { devboxId }).then((res) =>
    res.map(adaptAppListItem)
  );

export const execCommandInDevboxPod = (data: {
  devboxName: string;
  command: string;
  idePath: string;
  onDownloadProgress: (progressEvent: AxiosProgressEvent) => void;
  signal: AbortSignal;
}) =>
  POST('/api/execCommandInDevboxPod', data, {
    // responseType: 'stream',
    timeout: 0,
    onDownloadProgress: data.onDownloadProgress,
    signal: data.signal
  });
