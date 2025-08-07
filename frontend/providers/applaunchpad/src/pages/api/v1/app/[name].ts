import {
  GetAppByAppNameQuerySchema,
  DeleteAppByNameQuerySchema,
  UpdateAppResourcesSchema
} from '@/constants/schema';
import { LaunchpadApplicationSchema, transformFromLegacySchema } from '@/constants/schema';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getAppByName,
  deleteAppByName,
  createK8sContext,
  updateAppResources
} from '@/services/backend';
import { adaptAppDetail } from '@/utils/adapt';
import { DeployKindsType, AppDetailType } from '@/types/app';
import { z } from 'zod';

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

  // Get full AppDetailType data
  const appDetailData: AppDetailType = await adaptAppDetail(responseData, {
    SEALOS_DOMAIN: global.AppConfig.cloud.domain,
    SEALOS_USER_DOMAINS: global.AppConfig.cloud.userDomains
  });

  // Transform to standardized schema using whitelist approach
  const standardizedData = transformFromLegacySchema(appDetailData);

  // Validate against schema to ensure only defined fields are returned
  const validatedData = LaunchpadApplicationSchema.parse(standardizedData);

  return validatedData;
}

async function validateAppExists(name: string, k8s: any, res: NextApiResponse<ApiResp>) {
  try {
    await k8s.getDeployApp(name);
    return true;
  } catch (error: any) {
    jsonRes(res, {
      code: 404,
      error: `App ${name} not found`
    });
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { method } = req;
    const { name } = req.query as { name: string };

    const k8s = await createK8sContext(req);

    if (!(await validateAppExists(name, k8s, res))) {
      return;
    }

    if (method === 'GET') {
      const parseResult = GetAppByAppNameQuerySchema.safeParse(req.query);

      if (!parseResult.success) {
        return jsonRes(res, {
          code: 400,
          error: parseResult.error
        });
      }

      const response = await getAppByName(name, k8s);
      const filteredData = await processAppResponse(response);

      jsonRes(res, {
        data: filteredData
      });
    } else if (method === 'DELETE') {
      const parseResult = DeleteAppByNameQuerySchema.safeParse(req.query);

      if (!parseResult.success) {
        return jsonRes(res, {
          code: 400,
          error: parseResult.error
        });
      }

      await deleteAppByName(name, k8s);

      jsonRes(res, {
        message: 'successfully deleted'
      });
    } else if (method === 'PATCH') {
      const parseResult = UpdateAppResourcesSchema.safeParse(req.body);

      if (!parseResult.success) {
        return jsonRes(res, {
          code: 400,
          error: parseResult.error
        });
      }

      const updateData = parseResult.data;

      await updateAppResources(name, updateData, k8s);

      const response = await getAppByName(name, k8s);
      const filteredData = await processAppResponse(response);

      jsonRes(res, {
        data: filteredData
      });
    } else {
      res.setHeader('Allow', ['GET', 'DELETE', 'PATCH']);
      return jsonRes(res, {
        code: 405,
        error: `Method ${method} Not Allowed`
      });
    }
  } catch (err: any) {
    console.log('err', err);
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
