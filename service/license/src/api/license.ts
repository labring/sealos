import { GET, POST } from '@/services/request';
import { CreateLicenseParams, LicenseDB } from '@/types';

export const createLicense = (payload: CreateLicenseParams) => POST('/api/license/create', payload);

export const getLicenseRecord = ({ page, pageSize }: { page: number; pageSize: number }) =>
  POST<{ total: number; records: LicenseDB[] }>('/api/license/getRecord', {
    page,
    pageSize
  });

export const hasHistorical = () => GET('/api/license/hasHistorical');

export const getLicenseByClusterId = ({
  page,
  pageSize,
  clusterId
}: {
  page: number;
  pageSize: number;
  clusterId: string;
}) =>
  POST<{ total: number; records: LicenseDB[] }>('/api/license/getByClusterId', {
    page,
    pageSize,
    clusterId
  });
