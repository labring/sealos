import request from '@/services/request';
import {
  ApiResp,
  LayoutConfigType,
  CloudConfigType,
  AuthClientConfigType,
  AppClientConfigType,
  CommonClientConfigType,
  TNotification
} from '@/types';
import { UserTask } from '@/types/task';

// handle baidu
export const uploadConvertData = ({ newType, bdVid }: { newType: number[]; bdVid?: string }) => {
  const baseurl = `http://${process.env.HOSTNAME || 'localhost'}:${process.env.PORT || 3000}`;
  const defaultUrl = 'https://ads.sealos.run';
  if (!bdVid) {
    return Promise.reject('upload convert data params error');
  }
  return request.post(`${baseurl}/api/platform/uploadData`, {
    newType,
    bd_vid: bdVid,
    main_url: defaultUrl
  });
};

export const getUserTasks = () => {
  return request.get<UserTask[]>('/api/account/getTasks');
};

export const checkUserTask = () => {
  return request.get('/api/account/checkTask');
};

export const updateTask = (taskId: string) => {
  return request.post('/api/account/updateTask', { taskId });
};

export const getAppConfig = () => {
  return request.get<AppClientConfigType>('/api/platform/getAppConfig');
};

export const getCloudConfig = () => {
  return request.get<CloudConfigType>('/api/platform/getCloudConfig');
};

export const getCommonConfig = () => {
  return request.get<CommonClientConfigType>('/api/platform/getCommonConfig');
};

export const getLayoutConfig = () => {
  return request.get<LayoutConfigType>('/api/platform/getLayoutConfig');
};

export const getAuthConfig = () => {
  return request.get<AuthClientConfigType>('/api/platform/getAuthConfig');
};

export const getPriceBonus = () => {
  return request.get<
    any,
    ApiResp<{
      steps: string;
      ratios: string;
      activities: string;
    }>
  >('/api/price/bonus');
};

export const getWechatQR = () =>
  request.get<any, ApiResp<{ code: string; codeUrl: string }>>(
    '/api/auth/publicWechat/getWechatQR'
  );

export const getWechatResult = (payload: { code: string }) =>
  request.get<any, ApiResp<{ token: string }>>('/api/auth/publicWechat/getWechatResult', {
    params: payload
  });

export const getGlobalNotification = () => {
  return request.get<any, ApiResp<TNotification>>('/api/notification/global');
};

export const listNotification = () =>
  request.get<any, ApiResp<TNotification[]>>('/api/notification/listNotification');

export const getResource = () => {
  return request.get<
    any,
    ApiResp<{
      totalCpu: string;
      totalMemory: string;
      totalStorage: string;
      runningPodCount: string;
      totalGpuCount: string;
      totalPodCount: string;
    }>
  >('/api/desktop/getResource');
};

export const getUserBilling = () => {
  return request.post<
    any,
    ApiResp<{
      prevMonthTime: number;
      prevDayTime: number;
    }>
  >('/api/desktop/getBilling');
};
