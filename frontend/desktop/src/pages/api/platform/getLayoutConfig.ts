import { jsonRes } from '@/services/backend/response';
import { AppConfigType, DefaultLayoutConfig, LayoutConfigType } from '@/types/system';
import { readFileSync } from 'fs';
import type { NextApiRequest, NextApiResponse } from 'next';
import yaml from 'js-yaml';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const config = await getLayoutConfig();
  jsonRes(res, {
    data: config,
    code: 200
  });
}

export async function getLayoutConfig(): Promise<LayoutConfigType> {
  try {
    if (!global.AppConfig) {
      const filename =
        process.env.NODE_ENV === 'development' ? 'data/config.yaml.local' : '/app/data/config.yaml';
      global.AppConfig = yaml.load(readFileSync(filename, 'utf-8')) as AppConfigType;
    }
    return global.AppConfig.desktop.layout || DefaultLayoutConfig;
  } catch (error) {
    console.log('-getLayoutConfig-', error);
    return DefaultLayoutConfig;
  }
}
