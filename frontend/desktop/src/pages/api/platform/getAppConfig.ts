import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  AppConfigType,
  AuthConfigType,
  CloudConfigType,
  CommonConfigType,
  LayoutConfigType
} from '@/types/system';
import { getCloudConfig } from '@/pages/api/platform/getCloudConfig';
import { getAuthConfig } from '@/pages/api/platform/getAuthConfig';
import { getLayoutConfig } from '@/pages/api/platform/getLayoutConfig';
import { getCommonConfig } from '@/pages/api/platform/getCommonConfig';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const config = await getAppConfig();
  jsonRes(res, {
    data: config,
    code: 200
  });
}

function genResConfig(
  cloudConf: CloudConfigType,
  authConf: AuthConfigType,
  commonConf: CommonConfigType,
  layoutConf: LayoutConfigType
): AppConfigType {
  return {
    cloud: cloudConf,
    common: commonConf,
    desktop: {
      auth: authConf,
      layout: layoutConf
    }
  } as AppConfigType;
}

export async function getAppConfig(): Promise<AppConfigType> {
  try {
    const cloudConf = await getCloudConfig();
    const authConf = await getAuthConfig();
    const commonConf = await getCommonConfig();
    const layoutConf = await getLayoutConfig();
    console.log(layoutConf);
    return genResConfig(cloudConf, authConf, commonConf, layoutConf);
  } catch (error) {
    console.log('-getAppConfig-', error);
    return {} as AppConfigType;
  }
}
