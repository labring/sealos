import { Response as EnvResponse } from '@/pages/api/getEnv';
import type { Response as DBVersionMapType } from '@/pages/api/platform/getVersion';
import type { Response as resourcePriceResponse } from '@/pages/api/platform/resourcePrice';
import { GET } from '@/services/request';
import type { UserQuotaItemType } from '@/types/user';

export const getResourcePrice = () => GET<resourcePriceResponse>('/api/platform/resourcePrice');

export const getAppEnv = () => GET<EnvResponse>('/api/getEnv');

export const getDBVersionMap = () => GET<DBVersionMapType>('/api/platform/getVersion');

export const getUserQuota = () =>
  GET<{
    balance: number;
    quota: UserQuotaItemType[];
  }>('/api/platform/getQuota');
