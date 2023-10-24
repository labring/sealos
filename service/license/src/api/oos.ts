import { GET, POST } from '@/services/request';
import { LicensePayload, LicenseDB } from '@/types';

export const getFileByName = (fileName: string) => POST('/api/oss/get', { fileName: fileName });
