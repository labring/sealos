import { GET, POST } from '@/services/request';
import type { UserQuotaItemType, UserTask, userPriceType } from '@/types/user';
import { getUserSession } from '@/utils/user';
import { AuthCnamePrams, AuthDomainChallengeParams } from './params';
import type { EnvResponse } from '@/types';
import type { PublicDomainConflictOwner } from '@/utils/public-domain';

export type CustomDomainCertificateCoverageStatus =
  'covered' | 'pendingSync' | 'notConfigured' | 'unsupported';

export type CustomDomainCertificateCoverageResult = {
  customDomain: string;
  status: CustomDomainCertificateCoverageStatus;
  matchingDomain?: string;
  missingIn?: ('certificate' | 'higress')[];
  reason?: string;
};

export const getResourcePrice = () => GET<userPriceType>('/api/platform/resourcePrice');

export const getInitData = () => GET<EnvResponse>('/api/platform/getInitData');

export const getUserQuota = () =>
  GET<{
    quota: UserQuotaItemType[];
  }>('/api/platform/getQuota');

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

export const getImagePorts = (data: {
  imageName: string;
  imageRegistry?: {
    username?: string;
    password?: string;
    serverAddress?: string;
  };
}) =>
  POST<{
    ports: {
      port: number;
      protocol: 'TCP' | 'UDP' | 'SCTP';
    }[];
  }>('/api/platform/getImagePorts', data);

export const checkPublicDomain = (data: { prefix: string; domain: string; appName?: string }) =>
  POST<{
    available: boolean;
    prefix?: string;
    host?: string;
    conflictOwner?: PublicDomainConflictOwner;
  }>('/api/platform/checkPublicDomain', data);

export const checkCustomDomainCertificateCoverage = (data: { customDomain: string }) =>
  POST<CustomDomainCertificateCoverageResult>('/api/platform/checkCustomDomainCertificate', data);

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

export const checkReady = (appName: string) =>
  GET<{ url: string; ready: boolean; error?: string }[]>(`/api/checkReady?appName=${appName}`);
