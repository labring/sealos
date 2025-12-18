import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { jsonRes } from '@/services/backend/response';
import { pauseApp, createK8sContext } from '@/services/backend';
import { withErrorHandler } from '@/services/backend/middleware';
import { ResponseCode } from '@/types/response';

export default withErrorHandler(async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResp>
) {
  const { appName } = req.query as { appName: string };

  if (!appName) {
    return jsonRes(res, {
      code: ResponseCode.BAD_REQUEST,
      error: 'App name is required'
    });
  }

  const k8s = await createK8sContext(req);
  await pauseApp(appName, k8s);

  jsonRes(res, {
    message: 'App paused successfully'
  });
});
