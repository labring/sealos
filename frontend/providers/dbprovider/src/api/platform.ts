import { GET, POST, DELETE } from '@/services/request';
import type { Response as resourcePriceResponse } from '@/pages/api/platform/resourcePrice';
import type { Response as DBVersionMapType } from '@/pages/api/platform/getVersion';

export const getResourcePrice = () => GET<resourcePriceResponse>('/api/platform/resourcePrice');
export const getDBVersionMap = () => GET<DBVersionMapType>('/api/platform/getVersion');
