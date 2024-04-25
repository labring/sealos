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
  const config = await getAuthConfig();
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
    return genResConfig(
      await getCloudConfig(),
      await getAuthConfig(),
      await getCommonConfig(),
      await getLayoutConfig()
    );
  } catch (error) {
    console.log('-getAppConfig-', error);
    return {} as AppConfigType;
  }
}
