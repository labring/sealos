import { GET, POST } from '@/services/request';
import type { Response as InitDataType } from '@/pages/api/platform/getInitData';
import type { UserQuotaItemType, userPriceType } from '@/types/user';
import { AuthCnamePrams } from './params';

export const getResourcePrice = () => GET<userPriceType>('/api/platform/resourcePrice');
export const getInitData = () => GET<InitDataType>('/api/platform/getInitData');
export const getUserQuota = () =>
  GET<{
    balance: number;
    quota: UserQuotaItemType[];
  }>('/api/platform/getQuota');

export const postAuthCname = (data: AuthCnamePrams) => POST('/api/platform/authCname', data);
