import { jsonRes } from '@/services/backend/response';
import { AppConfigType, CloudConfigType, DefaultCloudConfig } from '@/types/system';
import { readFileSync } from 'fs';
import type { NextApiRequest, NextApiResponse } from 'next';
import yaml from 'js-yaml';
import process from 'process';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const config = await getCloudConfig();
  jsonRes(res, {
    data: config,
    code: 200
  });
}

function genResCloudConfig(conf: CloudConfigType): CloudConfigType {
  return {
    domain: conf.domain,
    port: conf.port
  } as CloudConfigType;
}

export async function getCloudConfig(): Promise<CloudConfigType> {
  try {
    if (!global.AppConfig) {
      const filename =
        process.env.NODE_ENV === 'development'
          ? process.env.CONFIG_PATH || 'data/config.yaml.local'
          : '/app/data/config.yaml';
      global.AppConfig = yaml.load(readFileSync(filename, 'utf-8')) as AppConfigType;
    }
    return genResCloudConfig(global.AppConfig.cloud) || DefaultCloudConfig;
  } catch (error) {
    console.log('-getAppConfig-', error);
    return DefaultCloudConfig;
  }
}
