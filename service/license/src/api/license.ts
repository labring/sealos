import { POST } from '@/services/request';
import { CreateLicenseParams, LicenseDB } from '@/types';

export const createLicense = (payload: CreateLicenseParams) => POST('/api/license/create', payload);

export const getLicenseRecord = ({ page, pageSize }: { page: number; pageSize: number }) =>
  POST<{ total: number; records: LicenseDB[] }>('/api/license/getRecord', {
    page,
    pageSize
  });
