import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';

export type SystemEnvResponse = {
  domain: string;
  desktopDomain: string;
  env_storage_className: string;
  migrate_file_image: string;
  minio_url: string;
  BACKUP_ENABLED: boolean;
  SHOW_DOCUMENT: boolean;
  CurrencySymbol: 'shellCoin' | 'cny' | 'usd';
  STORAGE_MAX_SIZE: number;
};

process.on('unhandledRejection', (reason, promise) => {
  console.error(`Caught unhandledRejection:`, reason, promise);
});

process.on('uncaughtException', (err) => {
  console.error(`Caught uncaughtException:`, err);
});

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  jsonRes<SystemEnvResponse>(res, {
    data: {
      domain: process.env.SEALOS_DOMAIN || 'cloud.sealos.io',
      desktopDomain: process.env.DESKTOP_DOMAIN || 'cloud.sealos.io',
      env_storage_className: process.env.STORAGE_CLASSNAME || 'openebs-backup',
      migrate_file_image: process.env.MIGRATE_FILE_IMAGE || 'ghcr.io/wallyxjh/test:7.1',
      minio_url: process.env.MINIO_URL || '',
      BACKUP_ENABLED: process.env.BACKUP_ENABLED === 'true',
      SHOW_DOCUMENT: process.env.SHOW_DOCUMENT === 'true',
      CurrencySymbol: (process.env.CURRENCY_SYMBOL || 'shellCoin') as 'shellCoin' | 'cny' | 'usd',
      STORAGE_MAX_SIZE: Number(process.env.STORAGE_MAX_SIZE) || 300
    }
  });
}
