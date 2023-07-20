import { GET, POST, DELETE } from '@/services/request';
import type { Response as resourcePriceResponse } from '@/pages/api/platform/resourcePrice';
import type { Response as DBVersionMapType } from '@/pages/api/platform/getVersion';
import { Response as EnvResponse } from '@/pages/api/getEnv';

export const getResourcePrice = () => GET<resourcePriceResponse>('/api/platform/resourcePrice');
export const getAppEnv = () => GET<EnvResponse>('/api/getEnv');
export const getDBVersionMap = () => GET<DBVersionMapType>('/api/platform/getVersion');
