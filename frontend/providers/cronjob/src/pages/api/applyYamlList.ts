import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { withErrorHandler } from '@/services/backend/middleware';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';

export default withErrorHandler(async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResp>
) {
  const { yamlList, type = 'create' } = req.body as {
    yamlList: string[];
    type?: 'create' | 'replace' | 'update';
  };

  if (!yamlList) {
    throw new Error('params error');
  }

  const { applyYamlList } = await getK8s({
    kubeconfig: await authSession(req)
  });

  await applyYamlList(yamlList, type);

  jsonRes(res);
});
