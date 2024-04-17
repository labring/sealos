import { POST } from '@/services/request';
import { TFile } from '@/utils/kubeFileSystem';

export const kubeFile_ls = (payload: {
  containerName: string;
  podName: string;
  path: string;
  showHidden: boolean;
}) =>
  POST<{
    directories: TFile[];
    files: TFile[];
  }>('/api/kubeFileSystem/ls', payload);

export const kubeFile_download = (payload: {
  containerName: string;
  podName: string;
  path: string;
}) => POST('/api/kubeFileSystem/download', payload);

export const kubeFile_rename = (payload: {
  containerName: string;
  podName: string;
  from: string;
  to: string;
}) => POST('/api/kubeFileSystem/mv', payload);

export const kubeFile_delete = (payload: {
  containerName: string;
  podName: string;
  path: string;
}) => POST('/api/kubeFileSystem/rm', payload);

export const kubeFile_upload = (
  payload: {
    containerName: string;
    podName: string;
    path: string;
  },
  formData: FormData
) =>
  POST(`/api/kubeFileSystem/upload`, formData, {
    params: payload
  });

export const kubeFile_mkdir = (payload: { containerName: string; podName: string; path: string }) =>
  POST(`/api/kubeFileSystem/mkdir`, payload);
