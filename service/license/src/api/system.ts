import { GET } from '@/services/request';
import { SystemEnv } from '@/types';

export const getSystemEnv = () => GET<SystemEnv>('/api/platform/getEnv');

export const getPriceBonus = () =>
  GET<{
    steps: string;
    ratios: string;
  }>('/api/price/bonus');
