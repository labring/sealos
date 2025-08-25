import { FeishuNotificationParams } from '@/pages/api/platform/feishu';
import { SystemEnvResponse } from '@/pages/api/platform/getEnv';
import { GET, POST } from '@/services/request';
import { AxiosProgressEvent } from 'axios';

export const getSystemEnv = () => GET<SystemEnvResponse>('/api/platform/getEnv');

export const uploadFile = (
  data: FormData,
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
) => {
  return POST<
    {
      originalName: string;
      fileName: string;
    }[]
  >('/api/minio/upload', data, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    timeout: 3 * 60 * 1000,
    onUploadProgress
  });
};

export const getFileUrl = ({ fileName }: { fileName: string }) => {
  return GET<string>('/api/minio/getUrl', { fileName });
};

export const deleteFileByName = ({ fileName }: { fileName: string }) => {
  return GET<string>('/api/minio/delete', { fileName });
};

export const FeishuNotification = (payload: FeishuNotificationParams) =>
  POST('/api/platform/feishu', payload);
