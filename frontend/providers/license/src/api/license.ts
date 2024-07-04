import { GET, POST } from '@/services/request';
import { LicenseCR } from '@/types';

export const applyLicense = (yamlList: string[], type: 'create' | 'replace' | 'update') =>
  POST('/api/applyYamlList', { yamlList, type });

export const getLicenseRecord = ({ page = 1, pageSize = 10 }: { page: number; pageSize: number }) =>
  GET<LicenseCR[]>('/api/license/getLicense', { page, pageSize });
