import {
  GetAppByAppNameQuerySchema,
  DeleteAppByNameQuerySchema,
  UpdateAppResourcesSchema
} from '@/constants/schema';
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
import { DeployKindsType } from '@/types/app';
import { filterUnusedKeys } from '@/utils/tools';

async function processAppResponse(response: PromiseSettledResult<any>[]) {
  const responseData = response
    .map((item: any) => {
      if (item.status === 'fulfilled') return item.value.body;
      if (+item.reason?.body?.code === 404) return '';
      throw new Error('Get APP Deployment Error');
    })
    .filter((item: any) => item)
    .flat() as DeployKindsType[];

  const data = await adaptAppDetail(responseData, {
    SEALOS_DOMAIN: global.AppConfig.cloud.domain,
    SEALOS_USER_DOMAINS: global.AppConfig.cloud.userDomains
  });

  return filterUnusedKeys(data);
}

async function validateAppExists(appName: string, k8s: any, res: NextApiResponse<ApiResp>) {
  try {
    await k8s.getDeployApp(appName);
    return true;
  } catch (error: any) {
    jsonRes(res, {
      code: 404,
      error: `App ${appName} not found`
    });
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { method } = req;
    const { appName } = req.query as { appName: string };

    const k8s = await createK8sContext(req);

    if (!(await validateAppExists(appName, k8s, res))) {
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

      const response = await getAppByName(appName, k8s);
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

      await deleteAppByName(appName, k8s);

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

      await updateAppResources(appName, updateData, k8s);

      const response = await getAppByName(appName, k8s);
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
