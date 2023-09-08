import { jsonRes } from '@/services/backend/response';
import { SystemConfigType } from '@/types/system';
import { readFileSync } from 'fs';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const config = await getSystemConfig();
  jsonRes(res, {
    data: config,
    code: 200
  });
}

const defaultConfig: SystemConfigType = {
  scripts: []
};

export async function getSystemConfig(): Promise<SystemConfigType> {
  try {
    const filename =
      process.env.NODE_ENV === 'development' ? 'data/config.local.json' : '/app/data/config.json';
    const res = JSON.parse(readFileSync(filename, 'utf-8'));
    return res;
  } catch (error) {
    console.log('get system config error, set default');
    return defaultConfig;
  }
}
