import { GET } from '@/services/request';
import { Response as EnvResponse } from '@/pages/api/platform/getEnv';
import { TSystemInfo } from '@/pages/api/platform/getClusterId';

export const getPlatformEnv = () => GET<EnvResponse>('/api/platform/getEnv');

export const getClusterId = () => GET<TSystemInfo>('/api/platform/getClusterId');
