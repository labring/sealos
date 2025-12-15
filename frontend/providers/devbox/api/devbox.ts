import { DELETE, GET, POST } from '@/services/request';
import {
  DevboxDetailTypeV2,
  DevboxEditTypeV2,
  DevboxListItemTypeV2,
  DevboxPatchPropsType,
  DevboxVersionListItemType,
  PodDetailType,
  ShutdownModeType
} from '@/types/devbox';
import { MonitorDataResult, MonitorQueryKey } from '@/types/monitor';
import { AxiosProgressEvent } from 'axios';
import { AppListItemType } from '@/types/app';

export const getMyDevboxList = () => GET<DevboxListItemTypeV2[]>('/api/getDevboxList');

export const getDevboxByName = (devboxName: string, mock = false) =>
  GET<DevboxDetailTypeV2>('/api/getDevboxByName', { devboxName, mock });

export const applyYamlList = (yamlList: string[], type: 'create' | 'replace' | 'update') =>
  POST('/api/applyYamlList', { yamlList, type });

export const createDevbox = (payload: DevboxEditTypeV2) => POST(`/api/createDevbox`, payload);

export const updateDevbox = (payload: { patch: DevboxPatchPropsType; devboxName: string }) =>
  POST(`/api/updateDevbox`, payload);

export const delDevbox = (devboxName: string) => DELETE('/api/delDevbox', { devboxName });

export const restartDevbox = (data: { devboxName: string }) => POST('/api/restartDevbox', data);

export const startDevbox = (data: { devboxName: string }) => POST('/api/startDevbox', data);

export const shutdownDevbox = (data: { devboxName: string; shutdownMode: ShutdownModeType }) =>
  POST('/api/shutdownDevbox', data);

export const getDevboxVersionList = (devboxName: string, devboxUid: string) =>
  GET<DevboxVersionListItemType[]>('/api/getDevboxVersionList', { devboxName, devboxUid });

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
  GET<PodDetailType[]>('/api/getDevboxPodsByDevboxName', { name });

export const getDevboxMonitorData = (payload: {
  queryName: string;
  queryKey: keyof MonitorQueryKey;
  step: string;
  start?: number;
  end?: number;
}) => GET<MonitorDataResult[]>(`/api/monitor/getMonitorData`, payload);

export const getAppsByDevboxId = (devboxId: string) =>
  GET<AppListItemType[]>('/api/getAppsByDevboxId', { devboxId });

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

export const updateDevboxRemark = (data: { devboxName: string; remark: string }) =>
  POST('/api/updateDevboxRemark', data);

export const uploadAndExtractFile = (
  formData: FormData,
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
) =>
  POST<{ success: boolean }>('/api/uploadAndExtractFile', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    timeout: 0,
    onUploadProgress
  });

export const getDevboxPorts = (devboxName: string) =>
  GET<{
    ports: {
      portName: string;
      number: number;
      protocol: string;
      networkName: string;
      exposesPublicDomain: boolean;
      publicDomain: string;
      customDomain: string;
      serviceName: string;
      privateAddress: string;
    }[];
  }>(`/api/getDevboxPorts?devboxName=${devboxName}`);

export const updateDevboxPorts = (
  devboxName: string,
  ports: {
    portName?: string;
    networkName?: string;
    number: number;
    protocol?: string;
    exposesPublicDomain?: boolean;
    publicDomain?: string;
    customDomain?: string;
  }[]
) =>
  POST<{
    ports: {
      portName: string;
      number: number;
      protocol: string;
      networkName: string;
      exposesPublicDomain: boolean;
      publicDomain: string;
      customDomain: string;
      serviceName: string;
      privateAddress: string;
    }[];
  }>(`/api/updateDevboxPorts`, { devboxName, ports });

export const updateDevboxWebIDEPort = (devboxName: string, port: number) =>
  POST<{
    publicDomain: string;
  }>(`/api/updateDevboxWebIDEPort`, { devboxName, port });

export const autostartDevbox = (data: { devboxName: string; execCommand?: string }) =>
  POST<{
    devboxName: string;
    autostartCreated: boolean;
    jobRecreated: boolean;
    resources: string[];
  }>(`/api/v1/devbox/${data.devboxName}/autostart`, {
    execCommand: data.execCommand
  });
