import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { jsonRes } from '@/services/backend/response';
import { pauseApp, createK8sContext } from '@/services/backend';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { appName } = req.query as { appName: string };

    if (!appName) {
      return jsonRes(res, {
        code: 400,
        error: 'App name is required'
      });
    }

    const k8s = await createK8sContext(req);
    await pauseApp(appName, k8s);

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
