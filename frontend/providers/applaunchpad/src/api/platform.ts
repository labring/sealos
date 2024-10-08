import type { Response as InitDataType } from '@/pages/api/platform/getInitData';
import { GET, POST } from '@/services/request';
import type { UserQuotaItemType, UserTask, userPriceType } from '@/types/user';
import { getUserSession } from '@/utils/user';
import { AuthCnamePrams } from './params';

export const getResourcePrice = () => GET<userPriceType>('/api/platform/resourcePrice');

export const getInitData = () => GET<InitDataType>('/api/platform/getInitData');

export const getUserQuota = () =>
  GET<{
    quota: UserQuotaItemType[];
  }>('/api/platform/getQuota');

export const postAuthCname = (data: AuthCnamePrams) => POST('/api/platform/authCname', data);

export const getUserTasks = () =>
  GET<{ needGuide: boolean; task: UserTask }>('/api/guide/getTasks', undefined, {
    headers: {
      Authorization: getUserSession()?.token
    }
  });

export const checkUserTask = () =>
  GET('/api/guide/checkTask', undefined, {
    headers: {
      Authorization: getUserSession()?.token
    }
  });

export const getPriceBonus = () =>
  GET<{ amount: number; gift: number }[]>('/api/guide/getBonus', undefined, {
    headers: {
      Authorization: getUserSession()?.token
    }
  });

export const checkPermission = (payload: { appName: string }) =>
  GET('/api/platform/checkPermission', payload);
