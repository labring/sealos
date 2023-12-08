import request from '@/services/request';
import { ApiResp } from '@/types';
import { AccountCRD } from '@/types/user';

// handle baidu
export const uploadConvertData = (newType: number[], url?: string) => {
  const defaultUrl = 'https://sealos.run/';
  const main_url = url || defaultUrl;
  const bd_vid = sessionStorage.getItem('bd_vid');
  if (!bd_vid) {
    return Promise.reject('upload convert data params error');
  }
  return request.post('/api/platform/uploadData', {
    newType,
    bd_vid,
    main_url
  });
};

export const updateDesktopGuide = () => {
  return request.post('/api/account/updateGuide');
};

export const getUserAccount = () => {
  return request.get<AccountCRD>('/api/account/getAccount');
};

export const getSystemEnv = () => {
  return request.get('/api/platform/getEnv');
};

export const getPriceBonus = () => {
  return request.get<
    any,
    ApiResp<{
      steps: string;
      ratios: string;
      activities: string;
    }>
  >('/api/price/bonus');
};
