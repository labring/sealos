import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  AppClientConfigType,
  AuthClientConfigType,
  CloudConfigType,
  CommonClientConfigType,
  DefaultAppClientConfig,
  LayoutConfigType
} from '@/types/system';
import { getCloudConfig } from '@/pages/api/platform/getCloudConfig';
import { getAuthClientConfig } from '@/pages/api/platform/getAuthConfig';
import { getLayoutConfig } from '@/pages/api/platform/getLayoutConfig';
import { getCommonClientConfig } from './getCommonConfig';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const config = await getAppConfig();
  jsonRes(res, {
    data: config,
    code: 200
  });
}

function genResConfig(
  cloudConf: CloudConfigType,
  authConf: AuthClientConfigType,
  commonConf: CommonClientConfigType,
  layoutConf: LayoutConfigType
): AppClientConfigType {
  return {
    cloud: cloudConf,
    common: commonConf,
    desktop: {
      auth: authConf,
      layout: layoutConf
    }
  };
}

export async function getAppConfig(): Promise<AppClientConfigType> {
  try {
    const cloudConf = await getCloudConfig();
    const authConf = await getAuthClientConfig();
    const commonConf = await getCommonClientConfig();
    const layoutConf = await getLayoutConfig();
    const conf = genResConfig(cloudConf, authConf, commonConf, layoutConf);
    return conf;
  } catch (error) {
    console.log('-getAppConfig-', error);
    return DefaultAppClientConfig;
  }
}
