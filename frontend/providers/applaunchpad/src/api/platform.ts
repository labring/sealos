import { GET, POST, DELETE } from '@/services/request';
import type { ServiceEnvType } from '@/types';
import type { Response as resourcePriceResponse } from '@/pages/api/platform/resourcePrice';

export const getEnvs = () => GET<ServiceEnvType>('/api/platform/getEnv');

export const getResourcePrice = () => GET<resourcePriceResponse>('/api/platform/resourcePrice');
