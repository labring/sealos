import { EnvResponse } from '@/pages/api/platform/getEnv';
import { GET } from '@/services/request';

export const updateRepo = () => GET('/api/updateRepo');

export const getPlatformEnv = () => GET<EnvResponse>('/api/platform/getEnv');
