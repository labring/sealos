import request from '@/services/request';

// handle baidu
export const uploadConvertData = (newType: number[], url?: string) => {
  const defaultUrl =
    window.location.hostname === 'cloud.sealos.io' ? 'https://sealos.io/' : 'https://sealos.run/';
  const main_url = url || defaultUrl;
  const bd_vid = sessionStorage.getItem('bd_vid');
  if (!bd_vid) {
    return Promise.reject('Parameter error');
  }
  return request.post('/api/platform/uploadData', {
    newType,
    bd_vid,
    main_url
  });
};
