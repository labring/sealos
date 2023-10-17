import { GET } from '@/services/request';
import { SystemEnv } from '@/types';

export const getSystemEnv = (): Promise<SystemEnv> =>
  fetch('/api/platform/getEnv')
    .then((res) => res.json())
    .then((res) => res.data);

export const getPriceBonus = () =>
  GET<{
    steps: string;
    ratios: string;
  }>('/api/price/bonus');
