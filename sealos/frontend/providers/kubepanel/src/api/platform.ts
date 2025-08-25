import { Response } from '@/pages/api/platform/init-data';
import { GET } from '@/services/request';

export const getInitData = () => GET<Response>('/api/platform/init-data');
