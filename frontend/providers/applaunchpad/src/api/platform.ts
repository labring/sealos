import { GET, POST, DELETE } from '@/services/request';
import type { ServiceEnvType } from '@/types';

export const getEnvs = () => GET<ServiceEnvType>('/api/platform/getEnv');
