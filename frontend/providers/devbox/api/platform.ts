import { GET, POST } from '@/services/request';
import type { UserQuotaItemType, UserTask } from '@/types/user';
import type { Env } from '@/types/static';
import { getDesktopSessionFromSessionStorage, getSessionFromSessionStorage } from '@/utils/user';
export const getAppEnv = () => GET<Env>('/api/getEnv');

export const getUserQuota = () =>
  GET<{
    quota: UserQuotaItemType[];
  }>('/api/platform/getQuota');

export const getRuntime = () => GET('/api/platform/getRuntime');

export const getResourcePrice = () => GET('/api/platform/resourcePrice');

export const postAuthCname = (data: { publicDomain: string; customDomain: string }) =>
  POST('/api/platform/authCname', data);

export const getUserTasks = () =>
  POST<{ needGuide: boolean; task: UserTask }>('/api/guide/getTasks', {
    desktopToAppToken: getDesktopSessionFromSessionStorage()?.token
  });

export const checkUserTask = () =>
  POST('/api/guide/checkTask', {
    desktopToAppToken: getDesktopSessionFromSessionStorage()?.token
  });
