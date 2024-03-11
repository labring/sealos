import { EnvResponse } from '@/types/index';
import { GET } from '@/services/request';
import { SystemConfigType, TemplateType } from '@/types/app';

export const updateRepo = () => GET('/api/updateRepo');

export const getTemplates = () =>
  GET<{ templates: TemplateType[]; menuKeys: string }>('/api/listTemplate');

export const getPlatformEnv = () => GET<EnvResponse>('/api/platform/getEnv');

export const getSystemConfig = () => {
  return GET<SystemConfigType>('/api/platform/getSystemConfig');
};
