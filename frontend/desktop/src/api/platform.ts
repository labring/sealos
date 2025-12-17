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
import { AdClickData } from '@/types/adClick';
import { LicenseCheckResponse } from '@/types/license';
import { UserTask } from '@/types/task';
import { WorkspaceQuotaResponse } from '@/types/workspace';
import {
  CreateAlertRequest,
  CreateAlertResponse,
  ListAlertsResponse,
  ToggleAlertsRequest,
  ToggleAlertsResponse,
  DeleteAlertsRequest,
  DeleteAlertsResponse
} from '@/types/alert';

/**
 * Upload advertisement conversion data to the platform.
 * @param data - The ad click data to be uploaded.
 */
export const uploadConvertData = (data: AdClickData) => {
  const baseurl = `http://${process.env.HOSTNAME || 'localhost'}:${process.env.PORT || 3000}`;

  return request.post(`${baseurl}/api/platform/uploadData`, {
    data
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

export const getRunningApps = () => {
  return request.post<
    any,
    ApiResp<{
      runningCount: {
        devbox: number;
        database: number;
        applaunchpad: number;
      };
    }>
  >('/api/desktop/getRunningApps');
};

export const getWorkspaceQuota = () =>
  request.get<any, ApiResp<WorkspaceQuotaResponse>>('/api/workspace/getQuota');

export const checkLicense = () =>
  request.get<any, ApiResp<LicenseCheckResponse>>('/api/license/check');

export const createAlert = (data: CreateAlertRequest) =>
  request.post<any, ApiResp<CreateAlertResponse>>('/api/account/alerts/createAlert', data);

export const listAlerts = () =>
  request.post<any, ApiResp<ListAlertsResponse>>('/api/account/alerts/listAlerts', {});

export const updateAlerts = (data: ToggleAlertsRequest) =>
  request.post<any, ApiResp<ToggleAlertsResponse>>('/api/account/alerts/updateAlerts', data);

export const deleteAlerts = (data: DeleteAlertsRequest) =>
  request.post<any, ApiResp<DeleteAlertsResponse>>('/api/account/alerts/deleteAlerts', data);

export const sendAlertBindEmailCode = (data: { id: string }) =>
  request.post<any, ApiResp>('/api/account/alerts/bind/email/sms', data);

export const sendAlertBindPhoneCode = (data: { id: string }) =>
  request.post<any, ApiResp>('/api/account/alerts/bind/phone/sms', data);
