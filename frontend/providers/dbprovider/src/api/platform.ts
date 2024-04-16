import { SystemEnvResponse } from '@/pages/api/getEnv';
import type { Response as DBVersionMapType } from '@/pages/api/platform/getVersion';
import type { Response as resourcePriceResponse } from '@/pages/api/platform/resourcePrice';
import { GET, POST } from '@/services/request';
import type { UserQuotaItemType } from '@/types/user';
import { AxiosProgressEvent } from 'axios';

export const getResourcePrice = () => GET<resourcePriceResponse>('/api/platform/resourcePrice');

export const getAppEnv = () => GET<SystemEnvResponse>('/api/getEnv');

export const getDBVersionMap = () => GET<DBVersionMapType>('/api/platform/getVersion');

export const getUserQuota = () =>
  GET<{
    quota: UserQuotaItemType[];
  }>('/api/platform/getQuota');

export const uploadFile = (
  data: FormData,
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
) => {
  return POST<string[]>('/api/minio/upload', data, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    timeout: 3 * 60 * 1000,
    onUploadProgress
  });
};
