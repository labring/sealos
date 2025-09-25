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
  CLIENT_DOMAIN_NAME: string;
  GATEWAY_DOMAIN_NAME: string;
  MANAGED_DB_ENABLED: string;
  CHAT2DB_AES_KEY: string;
  MIGRATION_JOB_CPU_REQUIREMENT: number;
  MIGRATION_JOB_MEMORY_REQUIREMENT: number;
  DUMPIMPORT_JOB_CPU_REQUIREMENT: number;
  DUMPIMPORT_JOB_MEMORY_REQUIREMENT: number;
  BACKUP_JOB_CPU_REQUIREMENT: number;
  BACKUP_JOB_MEMORY_REQUIREMENT: number;
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
      STORAGE_MAX_SIZE: Number(process.env.STORAGE_MAX_SIZE) || 300,
      CLIENT_DOMAIN_NAME: process.env.CLIENT_DOMAIN_NAME || '',
      GATEWAY_DOMAIN_NAME: process.env.GATEWAY_DOMAIN_NAME || '',
      MANAGED_DB_ENABLED: process.env.MANAGED_DB_ENABLED || '',
      CHAT2DB_AES_KEY: process.env.CHAT2DB_AES_KEY || '',
      MIGRATION_JOB_CPU_REQUIREMENT: Number(process.env.MIGRATION_JOB_CPU_REQUIREMENT ?? 0),
      MIGRATION_JOB_MEMORY_REQUIREMENT: Number(process.env.MIGRATION_JOB_MEMORY_REQUIREMENT ?? 0),
      DUMPIMPORT_JOB_CPU_REQUIREMENT: Number(process.env.DUMPIMPORT_JOB_CPU_REQUIREMENT ?? 0),
      DUMPIMPORT_JOB_MEMORY_REQUIREMENT: Number(process.env.DUMPIMPORT_JOB_MEMORY_REQUIREMENT ?? 0),
      BACKUP_JOB_CPU_REQUIREMENT: Number(process.env.BACKUP_JOB_CPU_REQUIREMENT ?? 0),
      BACKUP_JOB_MEMORY_REQUIREMENT: Number(process.env.BACKUP_JOB_MEMORY_REQUIREMENT ?? 0)
    }
  });
}
