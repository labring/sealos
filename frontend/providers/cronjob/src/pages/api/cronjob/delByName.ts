import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { withErrorHandler } from '@/services/backend/middleware';

export default withErrorHandler(async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResp>
) {
  const { name } = req.query as { name: string };
  if (!name) {
    throw new Error('deploy name is empty');
  }

  const { namespace, k8sBatch } = await getK8s({
    kubeconfig: await authSession(req)
  });

  const result = await k8sBatch.deleteNamespacedCronJob(name, namespace);
  jsonRes(res, { data: result });
});
