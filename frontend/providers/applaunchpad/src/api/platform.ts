import type { Response as InitDataType } from '@/pages/api/platform/getInitData';
import { GET, POST } from '@/services/request';
import { EnvResponse } from '@/types';
import type { AccountCRD, UserQuotaItemType, userPriceType } from '@/types/user';
import { AuthCnamePrams } from './params';
import { UpdateUserGuideParams } from '@/pages/api/guide/updateGuide';

export const getResourcePrice = () => GET<userPriceType>('/api/platform/resourcePrice');

export const getInitData = () => GET<InitDataType>('/api/platform/getInitData');

export const getUserQuota = () =>
  GET<{
    balance: number;
    quota: UserQuotaItemType[];
  }>('/api/platform/getQuota');

export const postAuthCname = (data: AuthCnamePrams) => POST('/api/platform/authCname', data);

// abandoned
export const getPlatformEnv = () => GET<EnvResponse>('/api/platform/getEnv');

export const updateDesktopGuide = (payload: UpdateUserGuideParams) =>
  POST('/api/guide/updateGuide', payload);

export const getUserAccount = () => GET<AccountCRD>('/api/guide/getAccount');

export const getPriceBonus = () => GET('/api/guide/getBonus');
