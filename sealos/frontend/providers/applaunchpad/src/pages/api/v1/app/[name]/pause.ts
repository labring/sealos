import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { jsonRes } from '@/services/backend/response';
import { pauseApp, createK8sContext } from '@/services/backend';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
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

    await pauseApp(name, k8s);

    jsonRes(res, {
      message: 'App paused successfully'
    });
  } catch (err: any) {
    console.log('Pause app error:', err);
    jsonRes(res, {
      code: 500,
      error: err.message || err
    });
  }
}
