import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { withErrorHandler } from '@/services/backend/middleware';
import { ResponseCode } from '@/types/response';
import dayjs from 'dayjs';

const sanitizeUrl = (value?: string | string[]) => {
  const url = Array.isArray(value) ? value[0] : value;
  if (!url) return undefined;

  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url.split('?')[0];
  }
};

const getRequestSource = (req: NextApiRequest) => ({
  method: req.method,
  forwardedFor: req.headers['x-forwarded-for'],
  realIp: req.headers['x-real-ip'],
  userAgent: req.headers['user-agent'],
  referer: sanitizeUrl(req.headers.referer)
});

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

  const { getDeployApp, apiClient, namespace, kube_user } = await getK8s({
    kubeconfig: await authSession(req.headers)
  });
  const logPayload = {
    action: 'restart',
    appName,
    namespace,
    user: kube_user?.name,
    request: getRequestSource(req)
  };

  console.info('[applaunchpad app operation] received', logPayload);
  const app = await getDeployApp(appName);

  if (!app.spec?.template.metadata?.labels) {
    return jsonRes(res, {
      code: ResponseCode.BAD_REQUEST,
      error: 'app data error'
    });
  }

  const previousRestartTime = app.spec.template.metadata.labels.restartTime;
  const nextRestartTime = `${dayjs().format('YYYYMMDDHHmmss')}`;
  app.spec.template.metadata.labels.restartTime = nextRestartTime;

  try {
    await apiClient.replace(app);
    console.info('[applaunchpad app operation] succeeded', {
      ...logPayload,
      previousRestartTime,
      nextRestartTime
    });
  } catch (error) {
    console.error('[applaunchpad app operation] failed', {
      ...logPayload,
      previousRestartTime,
      nextRestartTime,
      error
    });
    throw error;
  }

  jsonRes(res);
});
