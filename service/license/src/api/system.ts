import { GET, POST } from '@/services/request';
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

// handle baidu
export const uploadConvertData = (newType: number[], url?: string) => {
  const defaultUrl = 'https://sealos.run/';
  const main_url = url || defaultUrl;
  const bd_vid = sessionStorage.getItem('bd_vid');
  if (!bd_vid) {
    return Promise.reject('upload convert data params error');
  }
  return POST('/api/platform/uploadData', {
    newType,
    bd_vid,
    main_url
  });
};
