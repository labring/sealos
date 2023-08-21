import { GET } from '@/services/request';
import type { Response as InitDataType } from '@/pages/api/platform/getInitData';
import type { UserQuoteItemType, userPriceType } from '@/types/user';

export const getResourcePrice = () => GET<userPriceType>('/api/platform/resourcePrice');
export const getInitData = () => GET<InitDataType>('/api/platform/getInitData');
export const getUserQuota = () =>
  GET<{
    balance: number;
    quota: UserQuoteItemType[];
  }>('/api/platform/getQuota');
