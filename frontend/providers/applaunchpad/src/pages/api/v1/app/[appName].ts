import {
  GetAppByAppNameQuerySchema,
  DeleteAppByNameQuerySchema,
  CreateAppRequestSchema
} from '@/constants/schema';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAppByName, deleteAppByName, createApp, createK8sContext } from '@/services/backend';
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

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { method } = req;

    if (method === 'GET') {
      const parseResult = GetAppByAppNameQuerySchema.safeParse(req.query);

      if (!parseResult.success) {
        return jsonRes(res, {
          code: 400,
          error: parseResult.error
        });
      }

      const { appName } = parseResult.data;

      const k8s = await createK8sContext(req);

      try {
        await k8s.getDeployApp(appName);
      } catch (error: any) {
        return jsonRes(res, {
          code: 404,
          error: `App ${appName} not found`
        });
      }

      const response = await getAppByName(appName, k8s);
      const filteredData = await processAppResponse(response);

      jsonRes(res, {
        data: filteredData
      });
    } else if (method === 'POST') {
      // Handle POST request - create app
      const parseResult = CreateAppRequestSchema.safeParse(req.body);

      if (!parseResult.success) {
        return jsonRes(res, {
          code: 400,
          error: parseResult.error
        });
      }

      const { appForm } = parseResult.data;

      // Validate that appName in URL matches appName in form
      const { appName: urlAppName } = req.query as { appName: string };
      if (urlAppName !== appForm.appName) {
        return jsonRes(res, {
          code: 400,
          error: 'App name in URL does not match app name in form'
        });
      }

      const k8s = await createK8sContext(req);
      await createApp(appForm, k8s);

      // Get application details after creation
      const response = await getAppByName(appForm.appName, k8s);
      const filteredData = await processAppResponse(response);

      jsonRes(res, {
        data: filteredData
      });
    } else if (method === 'DELETE') {
      // Handle DELETE request - delete app by name
      const parseResult = DeleteAppByNameQuerySchema.safeParse(req.query);
      console.log(req.query, 'req.query');

      if (!parseResult.success) {
        return jsonRes(res, {
          code: 400,
          error: parseResult.error
        });
      }

      const { appName } = parseResult.data;

      const k8s = await createK8sContext(req);

      try {
        await k8s.getDeployApp(appName);
      } catch (error: any) {
        return jsonRes(res, {
          code: 404,
          error: `App ${appName} not found`
        });
      }

      await deleteAppByName(appName, k8s);

      jsonRes(res, {
        message: 'successfully deleted'
      });
    } else {
      // Method not allowed
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
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
