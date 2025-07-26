import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';
import { GetApps } from '../../getApps';
import { adaptAppListItem } from '@/utils/adapt';
import { CreateAppRequestSchema } from '@/constants/schema';
import { createApp, createK8sContext } from '@/services/backend';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { method } = req;

    if (method === 'GET') {
      const apps = await GetApps({ req });
      const adaptApps = apps.map(adaptAppListItem);

      jsonRes(res, { data: adaptApps });
    } else if (method === 'POST') {
      const parseResult = CreateAppRequestSchema.safeParse(req.body);

      if (!parseResult.success) {
        return jsonRes(res, {
          code: 400,
          error: parseResult.error
        });
      }

      const appForm = parseResult.data;
      const k8s = await createK8sContext(req);

      await createApp(appForm, k8s);

      jsonRes(res, {
        data: { message: 'App created successfully', appName: appForm.appName }
      });
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
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
