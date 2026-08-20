import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { jsonRes } from '@/services/backend/response';
import { startApp, createK8sContext } from '@/services/backend';
import { withErrorHandler } from '@/services/backend/middleware';
import { ResponseCode } from '@/types/response';

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
      error: 'App name is required'
    });
  }

  const k8s = await createK8sContext(req);
  const logPayload = {
    action: 'start',
    appName,
    namespace: k8s.namespace,
    user: k8s.kube_user?.name,
    request: getRequestSource(req)
  };

  console.info('[applaunchpad app operation] received', logPayload);

  try {
    await startApp(appName, k8s);
    console.info('[applaunchpad app operation] succeeded', logPayload);
  } catch (error) {
    console.error('[applaunchpad app operation] failed', {
      ...logPayload,
      error
    });
    throw error;
  }

  jsonRes(res, {
    message: 'App started successfully'
  });
});
