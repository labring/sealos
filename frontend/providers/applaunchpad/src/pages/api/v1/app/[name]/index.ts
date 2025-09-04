import {
  GetAppByAppNameQuerySchema,
  DeleteAppByNameQuerySchema,
  UpdateAppResourcesSchema
} from '@/types/request_schema';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getAppByName,
  deleteAppByName,
  createK8sContext,
  updateAppResources,
  processAppResponse
} from '@/services/backend';

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
