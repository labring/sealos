import { GET, POST, DELETE } from '@/services/request';
import type { Response as resourcePriceResponse } from '@/pages/api/platform/resourcePrice';
import type { Response as InitDataType } from '@/pages/api/platform/getInitData';

export const getResourcePrice = () => GET<resourcePriceResponse>('/api/platform/resourcePrice');
export const getInitData = () => GET<InitDataType>('/api/platform/getInitData');
