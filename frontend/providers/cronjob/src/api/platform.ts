import { GET } from '@/services/request';
import { EnvResponse } from '@/pages/api/platform/getEnv';

export const getPlatformEnv = () => GET<EnvResponse>('/api/platform/getEnv');
