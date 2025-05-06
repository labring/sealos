import { GetAppByAppNameQuerySchema } from '@/constants/schema';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';
import { GetAppByAppName } from '../getAppByAppName';
import { adaptAppDetail } from '@/utils/adapt';
import { DeployKindsType } from '@/types/app';
import { filterUnusedKeys } from '@/utils/tools';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const parseResult = GetAppByAppNameQuerySchema.safeParse(req.query);

    if (!parseResult.success) {
      return jsonRes(res, {
        code: 400,
        error: parseResult.error
      });
    }

    const { appName } = parseResult.data;

    const response = await GetAppByAppName({ appName, req });

    // Check for errors other than 404
    const responseData = response
      .map((item) => {
        if (item.status === 'fulfilled') return item.value.body;
        if (+item.reason?.body?.code === 404) return '';
        throw new Error('Get APP Deployment Error');
      })
      .filter((item) => item)
      .flat() as DeployKindsType[];

    const data = await adaptAppDetail(responseData, {
      SEALOS_DOMAIN: global.AppConfig.cloud.domain,
      SEALOS_USER_DOMAINS: global.AppConfig.cloud.userDomains
    });

    const filteredData = filterUnusedKeys(data);

    jsonRes(res, {
      data: filteredData
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
