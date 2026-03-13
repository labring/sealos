import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { withErrorHandler } from '@/services/backend/middleware';
import { ResponseCode } from '@/types/response';
import dayjs from 'dayjs';

export default withErrorHandler(async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResp>
) {
  const { appName } = req.query as { appName: string };
  if (!appName) {
    return jsonRes(res, {
      code: ResponseCode.BAD_REQUEST,
      error: 'appName is required'
    });
  }

  const { getDeployApp, apiClient } = await getK8s({
    kubeconfig: await authSession(req.headers)
  });

  const app = await getDeployApp(appName);

  if (!app.spec?.template.metadata?.labels) {
    return jsonRes(res, {
      code: ResponseCode.BAD_REQUEST,
      error: 'app data error'
    });
  }

  app.spec.template.metadata.labels['restartTime'] = `${dayjs().format('YYYYMMDDHHmmss')}`;
  await apiClient.replace(app);

  jsonRes(res);
});
