import { GET } from '@/services/request';
import { Response as EnvResponse } from '@/pages/api/platform/getEnv';

export const getPlatformEnv = () => GET<EnvResponse>('/api/platform/getEnv');

export const getClusterId = () => GET<{ systemId: string }>('/api/platform/getClusterId');
