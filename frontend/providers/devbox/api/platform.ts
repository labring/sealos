import { GET, POST } from '@/services/request';
import type { UserTask } from '@/types/user';
import type { Env } from '@/types/static';
import { getDesktopSessionFromSessionStorage } from '@/utils/user';
import { WorkspaceQuotaItem } from '@/types/workspace';
export const getAppEnv = () => GET<Env>('/api/getEnv');

export const getWorkspaceQuota = () =>
  GET<{
    quota: WorkspaceQuotaItem[];
  }>('/api/platform/getQuota', undefined, {
    // ? This API needs authenticate to account service using user info in DESKTOP SESSION.
    headers: {
      'X-Desktop-Token': getDesktopSessionFromSessionStorage()?.token
    }
  });

export const getUserIsOutStandingPayment = () =>
  GET<{
    isOutStandingPayment: boolean;
  }>('/api/platform/getDebt');

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

export const checkReady = (devboxName: string) =>
  GET<{ url: string; ready: boolean; error?: string }[]>(
    `/api/checkReady?devboxName=${devboxName}`
  );
