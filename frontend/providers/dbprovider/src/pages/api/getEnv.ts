import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { resolveDataflowEnabled } from '@/services/backend/dataflow';
import type { NextApiRequest, NextApiResponse } from 'next';

export type SystemEnvResponse = {
  domain: string;
  desktopDomain: string;
  env_storage_className: string;
  migrate_file_image: string;
  minio_url: string;
  BACKUP_ENABLED: boolean;
  LOG_ENABLED: boolean;
  SHOW_DOCUMENT: boolean;
  DATA_IMPORT_ENABLED: boolean;
  KAFKA_ENABLED: boolean;
  CurrencySymbol: 'shellCoin' | 'cny' | 'usd';
  STORAGE_MAX_SIZE: number;
  DATAFLOW_ENABLED: boolean;
};

process.on('unhandledRejection', (reason, promise) => {
  console.error(`Caught unhandledRejection:`, reason, promise);
});

process.on('uncaughtException', (err) => {
  console.error(`Caught uncaughtException:`, err);
});

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  const DATAFLOW_ENABLED = await resolveDataflowEnabled();

  jsonRes<SystemEnvResponse>(res, {
    data: {
      domain: process.env.SEALOS_DOMAIN || 'cloud.sealos.io',
      desktopDomain: process.env.DESKTOP_DOMAIN || 'cloud.sealos.io',
      env_storage_className: process.env.STORAGE_CLASSNAME || 'openebs-backup',
      migrate_file_image: process.env.MIGRATE_FILE_IMAGE || 'ghcr.io/wallyxjh/test:7.1',
      minio_url: process.env.MINIO_URL || '',
      BACKUP_ENABLED: process.env.BACKUP_ENABLED === 'true',
      LOG_ENABLED: process.env.LOG_ENABLED === 'true',
      SHOW_DOCUMENT: process.env.SHOW_DOCUMENT === 'true',
      DATA_IMPORT_ENABLED: process.env.DATA_IMPORT_ENABLED !== 'false',
      KAFKA_ENABLED: process.env.KAFKA_ENABLED !== 'false',
      CurrencySymbol: (process.env.CURRENCY_SYMBOL || 'shellCoin') as 'shellCoin' | 'cny' | 'usd',
      STORAGE_MAX_SIZE: Number(process.env.STORAGE_MAX_SIZE) || 300,
      DATAFLOW_ENABLED
    }
  });
}
