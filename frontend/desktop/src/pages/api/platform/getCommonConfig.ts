import { jsonRes } from '@/services/backend/response';
import {
  AppConfigType,
  CommonClientConfigType,
  CommonConfigType,
  DefaultCommonClientConfig
} from '@/types/system';
import { readFileSync } from 'fs';
import yaml from 'js-yaml';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const config = await getCommonClientConfig();
  jsonRes(res, {
    data: config,
    code: 200
  });
}
function genResCommonClientConfig(common: CommonConfigType): CommonClientConfigType {
  return {
    trackingEnabled: !!common.trackingEnabled,
    enterpriseRealNameAuthEnabled: !!common.enterpriseRealNameAuthEnabled,
    realNameAuthEnabled: !!common.realNameAuthEnabled,
    realNameReward: common.realNameReward || 0,
    guideEnabled: !!common.guideEnabled,
    rechargeEnabled: !!common.rechargeEnabled,
    cfSiteKey: common.cfSiteKey || ''
  };
}
export async function getCommonClientConfig(): Promise<CommonClientConfigType> {
  try {
    if (!global.AppConfig) {
      const filename =
        process.env.NODE_ENV === 'development' ? 'data/config.local.yaml' : '/app/data/config.yaml';
      global.AppConfig = yaml.load(readFileSync(filename, 'utf-8')) as AppConfigType;
    }
    return genResCommonClientConfig(global.AppConfig.common);
  } catch (error) {
    console.log('-getLayoutConfig-', error);
    return DefaultCommonClientConfig;
  }
}
