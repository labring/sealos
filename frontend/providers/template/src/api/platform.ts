import { EnvResponse } from '@/types/index';
import { GET } from '@/services/request';
import { SystemConfigType, TemplateType } from '@/types/app';
import type { UserTask, userPriceType } from '@/types/user';
import useSessionStore from '@/store/session';

export const updateRepo = () => GET('/api/updateRepo');

export const getTemplates = (language?: string) =>
  GET<{ templates: TemplateType[]; menuKeys: string }>('/api/listTemplate', {
    language
  });

export const getPlatformEnv = (
  { insideCloud }: { insideCloud: boolean } = { insideCloud: false }
) => GET<EnvResponse>('/api/platform/getEnv', { insideCloud });

export const getSystemConfig = () => {
  return GET<SystemConfigType>('/api/platform/getSystemConfig');
};

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
