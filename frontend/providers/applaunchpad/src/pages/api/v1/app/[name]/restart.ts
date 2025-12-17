import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { jsonRes } from '@/services/backend/response';
import { restartApp, createK8sContext } from '@/services/backend';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    if (req.method !== 'POST') {
      return jsonRes(res, {
        code: 405,
        error: `Method ${req.method} Not Allowed`
      });
    }

    const { name } = req.query as { name: string };

    if (!name) {
      return jsonRes(res, {
        code: 400,
        error: 'App name is required'
      });
    }

    const k8s = await createK8sContext(req);

    try {
      await k8s.getDeployApp(name);
    } catch (error: any) {
      return jsonRes(res, {
        code: 404,
        error: `App ${name} not found`
      });
    }

    await restartApp(name, k8s);

    jsonRes(res, {
      message: 'App restarted successfully'
    });
  } catch (err: any) {
    console.log('Restart app error:', err);
    jsonRes(res, {
      code: 500,
      error: err.message || err
    });
  }
}
