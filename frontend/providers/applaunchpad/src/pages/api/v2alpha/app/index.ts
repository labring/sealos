import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  CreateLaunchpadRequestSchema,
  transformToLegacySchema,
  transformFromLegacySchema
} from '@/types/v2alpha/request_schema';
import { createApp, createK8sContext, getAppByName } from '@/services/backend';
import { adaptAppDetail } from '@/utils/adapt';
import { DeployKindsType, AppDetailType } from '@/types/app';
import { z } from 'zod';
import { LaunchpadApplicationSchema } from '@/types/v2alpha/schema';

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { method } = req;

    if (method === 'POST') {
      const parseResult = CreateLaunchpadRequestSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          error: 'Invalid request body.',
          details: parseResult.error.issues
        });
      }

      const standardRequest = parseResult.data;
      const legacyRequest = transformToLegacySchema(standardRequest);

      const k8s = await createK8sContext(req);
      await createApp(legacyRequest, k8s);

      return res.status(204).end();
    } else {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({
        error: 'Method not allowed'
      });
    }
  } catch (err: any) {
    return res.status(500).json({
      error: err.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}
