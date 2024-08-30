import { EnvResponse } from '@/types/index';
import { GET } from '@/services/request';
import { SystemConfigType, TemplateType } from '@/types/app';
import type { UserQuotaItemType, userPriceType } from '@/types/user';

export const updateRepo = () => GET('/api/updateRepo');

export const getTemplates = () =>
  GET<{ templates: TemplateType[]; menuKeys: string }>('/api/listTemplate');

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
