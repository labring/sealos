import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { jsonRes } from '@/services/backend/response';
import { startApp, createK8sContext } from '@/services/backend';

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
    await startApp(name, k8s);

    jsonRes(res, {
      message: 'App started successfully'
    });
  } catch (err: any) {
    console.log('Start app error:', err);
    jsonRes(res, {
      code: 500,
      error: err.message || err
    });
  }
}
