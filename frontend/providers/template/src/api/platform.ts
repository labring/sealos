import { EnvResponse } from '@/types/index';
import { GET } from '@/services/request';
import { SystemConfigType, TemplateType } from '@/types/app';
import type { UserQuotaItemType, UserTask, userPriceType } from '@/types/user';
import { getUserSession } from '@/utils/user';
import useSessionStore from '@/store/session';

export const updateRepo = () => GET('/api/updateRepo');

export const getTemplates = (language?: string) =>
  GET<{ templates: TemplateType[]; menuKeys: string }>('/api/listTemplate', {
    language
  });

export const getPlatformEnv = () => GET<EnvResponse>('/api/platform/getEnv');

export const getSystemConfig = () => {
  return GET<SystemConfigType>('/api/platform/getSystemConfig');
};

export const getUserQuota = () =>
  GET<{
    balance: number;
    quota: UserQuotaItemType[];
  }>('/api/platform/getQuota');

export const getResourcePrice = () => GET<userPriceType>('/api/platform/resourcePrice');

export const getUserTasks = () =>
  GET<{ needGuide: boolean; task: UserTask }>('/api/guide/getTasks', undefined, {
    headers: {
      Authorization: useSessionStore.getState().getSession()?.token
    }
  });

export const checkUserTask = () =>
  GET('/api/guide/checkTask', undefined, {
    headers: {
      Authorization: useSessionStore.getState().getSession()?.token
    }
  });

export const getPriceBonus = () =>
  GET<{ amount: number; gift: number }[]>('/api/guide/getBonus', undefined, {
    headers: {
      Authorization: useSessionStore.getState().getSession()?.token
    }
  });
