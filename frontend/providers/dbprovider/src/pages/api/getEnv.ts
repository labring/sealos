import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';

export type SystemEnvResponse = {
  domain: string;
  env_storage_className: string;
  migrate_file_image: string;
  minio_url: string;
  BACKUP_ENABLED: boolean;
  SHOW_DOCUMENT: boolean;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  jsonRes<SystemEnvResponse>(res, {
    data: {
      domain: process.env.SEALOS_DOMAIN || 'cloud.sealos.io',
      env_storage_className: process.env.STORAGE_CLASSNAME || 'openebs-backup',
      migrate_file_image: process.env.MIGRATE_FILE_IMAGE || 'ghcr.io/wallyxjh/test:7.1',
      minio_url: process.env.MINIO_URL || '',
      BACKUP_ENABLED: process.env.BACKUP_ENABLED === 'true',
      SHOW_DOCUMENT: process.env.SHOW_DOCUMENT === 'true'
    }
  });
}
