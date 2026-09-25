import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import { startApp, createK8sContext } from '@/services/backend';
import { ResponseCode } from '@/types/response';

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
    await startApp(appName, k8s);

    jsonRes(res, {
      message: 'App started successfully'
    });
  } catch (err: any) {
    console.log('Start app error:', err);
    jsonRes(res, handleK8sError(err, { forbiddenCode: ResponseCode.FORBIDDEN }));
  }
}
