import { SystemEnvResponse } from '@/pages/api/getEnv';
import type { Response as DBVersionMapType } from '@/pages/api/platform/getVersion';
import type { Response as resourcePriceResponse } from '@/pages/api/platform/resourcePrice';
import type { AddonItem } from '@/pages/api/getAddonList';
import { GET, POST } from '@/services/request';
import type { UserTask } from '@/types/user';
import { WorkspaceQuotaItem } from '@/types/workspace';
import { getUserSession } from '@/utils/user';
import { AxiosProgressEvent } from 'axios';

export const getResourcePrice = () => GET<resourcePriceResponse>('/api/platform/resourcePrice');

export const getAppEnv = () => GET<SystemEnvResponse>('/api/getEnv');

export const getDBVersionMap = () => GET<DBVersionMapType>('/api/platform/getVersion');

export const getAddonList = () => GET<AddonItem[]>('/api/getAddonList');

export const getWorkspaceQuota = () =>
  GET<{
    quota: WorkspaceQuotaItem[];
  }>('/api/platform/getQuota', undefined, {
    // ? This API needs authenticate to account service using user info in DESKTOP SESSION.
    headers: {
      Authorization: getUserSession()?.token
    }
  });

export const uploadFile = (
  data: FormData,
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
) => {
  return POST<string[]>('/api/minio/upload', data, {
    // headers: {
    //   'Content-Type': 'multipart/form-data'
    // },
    timeout: 3 * 60 * 1000,
    onUploadProgress
  });
};

export const getUserTasks = () =>
  GET<{ needGuide: boolean; task: UserTask }>('/api/guide/getTasks', undefined, {
    headers: {
      Authorization: getUserSession()?.token
    }
  });

export const checkUserTask = () =>
  GET('/api/guide/checkTask', undefined, {
    headers: {
      Authorization: getUserSession()?.token
    }
  });
