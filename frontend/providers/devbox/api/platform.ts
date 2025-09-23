import { GET, POST } from '@/services/request';
import type { UserTask } from '@/types/user';
import type { Env } from '@/types/static';
import { AuthCnamePrams, AuthDomainChallengeParams } from '@/types/params';
import { useUserStore } from '@/stores/user';
export const getAppEnv = () => GET<Env>('/api/getEnv');

export const getUserIsOutStandingPayment = () =>
  GET<{
    isOutStandingPayment: boolean;
  }>('/api/platform/getDebt');

export const getRuntime = () => GET('/api/platform/getRuntime');

export const getResourcePrice = () => GET('/api/platform/resourcePrice');

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
  POST<{ needGuide: boolean; task: UserTask }>('/api/guide/getTasks', {
    desktopToAppToken: useUserStore.getState()?.session?.token
  });

export const checkUserTask = () =>
  POST('/api/guide/checkTask', {
    desktopToAppToken: useUserStore.getState()?.session?.token
  });

export const checkReady = (devboxName: string) =>
  GET<{ url: string; ready: boolean; error?: string }[]>(
    `/api/checkReady?devboxName=${devboxName}`
  );
