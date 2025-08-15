import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  CreateLaunchpadRequestSchema,
  transformToLegacySchema,
  transformFromLegacySchema
} from '@/types/request_schema';
import { createApp, createK8sContext, getAppByName } from '@/services/backend';
import { adaptAppDetail } from '@/utils/adapt';
import { DeployKindsType, AppDetailType } from '@/types/app';
import { z } from 'zod';
import { LaunchpadApplicationSchema } from '@/types/schema';

async function processAppResponse(
  response: PromiseSettledResult<any>[]
): Promise<z.infer<typeof LaunchpadApplicationSchema>> {
  const responseData = response
    .map((item: any) => {
      if (item.status === 'fulfilled') return item.value.body;
      if (+item.reason?.body?.code === 404) return '';
      throw new Error('Get APP Deployment Error');
    })
    .filter((item: any) => item)
    .flat() as DeployKindsType[];

  const appDetailData: AppDetailType = await adaptAppDetail(responseData, {
    SEALOS_DOMAIN: global.AppConfig.cloud.domain,
    SEALOS_USER_DOMAINS: global.AppConfig.cloud.userDomains
  });
  const standardizedData = transformFromLegacySchema(appDetailData);
  const validatedData = LaunchpadApplicationSchema.parse(standardizedData);
  return validatedData;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { method } = req;

    if (method === 'POST') {
      const parseResult = CreateLaunchpadRequestSchema.safeParse(req.body);

      if (!parseResult.success) {
        return jsonRes(res, {
          code: 400,
          error: parseResult.error
        });
      }

      const standardRequest = parseResult.data;
      const legacyRequest = transformToLegacySchema(standardRequest);

      const k8s = await createK8sContext(req);
      await createApp(legacyRequest, k8s);

      const response = await getAppByName(standardRequest.name, k8s);
      const filteredData = await processAppResponse(response);

      jsonRes(res, {
        data: filteredData
      });
    } else {
      res.setHeader('Allow', ['POST']);
      return jsonRes(res, {
        code: 405,
        error: `Method ${method} Not Allowed`
      });
    }
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
