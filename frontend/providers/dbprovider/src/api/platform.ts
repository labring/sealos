import { GET, POST, DELETE } from '@/services/request';
import type { Response as resourcePriceResponse } from '@/pages/api/platform/resourcePrice';

export const getResourcePrice = () => GET<resourcePriceResponse>('/api/platform/resourcePrice');
