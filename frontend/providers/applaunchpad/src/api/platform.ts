import { GET, POST } from '@/services/request';
import type { UserTask, userPriceType } from '@/types/user';
import { getUserSession } from '@/utils/user';
import { AuthCnamePrams, AuthDomainChallengeParams } from './params';
import type { EnvResponse } from '@/types';
import { WorkspaceQuotaItem } from '@/types/workspace';

export const getResourcePrice = () => GET<userPriceType>('/api/platform/resourcePrice');

export const getInitData = () => GET<EnvResponse>('/api/platform/getInitData');

export const postAuthCname = (data: AuthCnamePrams) => POST('/api/platform/authCname', data);

export const postAuthDomainChallenge = (data: AuthDomainChallengeParams) =>
  POST<{
    verified: boolean;
    domain: string;
    challengeUrl: string;
    proxy: {
      isProxy: boolean;
      proxyType?: string;
      details?: any;
    };
  }>('/api/platform/authDomainChallenge', data);

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

export const getWorkspaceQuota = () =>
  GET<{
    quota: WorkspaceQuotaItem[];
  }>('/api/platform/getQuota', undefined, {
    // ? This API needs authenticate to account service using user info in DESKTOP SESSION.
    headers: {
      Authorization: getUserSession()?.token
    }
  });

export const getWorkspaceSubscriptionInfo = () =>
  POST<{
    subscription: {
      type: 'PAYG' | 'SUBSCRIPTION';
    };
  }>('/api/platform/info', undefined, {
    // ? This API needs authenticate to account service using user info in DESKTOP SESSION.
    headers: {
      Authorization: getUserSession()?.token
    }
  });

export const checkPermission = (payload: { appName: string }) =>
  GET('/api/platform/checkPermission', payload);

export const checkReady = (appName: string) =>
  GET<{ url: string; ready: boolean; error?: string }[]>(`/api/checkReady?appName=${appName}`);
