import { GET, POST } from '@/services/request';
import { LicensePayload, LicenseDB } from '@/types';

export const createLicenseRecord = (payload: LicensePayload) =>
  POST('/api/license/createLicenseRecord', payload);

export const getLicenseRecord = ({ page, pageSize }: { page: number; pageSize: number }) =>
  POST<{ total: number; records: LicenseDB[] }>('/api/license/getLicenseRecord', {
    page,
    pageSize
  });
