import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { withErrorHandler } from '@/services/backend/middleware';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ResponseCode } from '@/types/response';

export default withErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { yamlList, type = 'create' } = req.body as {
    yamlList: string[];
    type: 'create' | 'replace' | 'dryrun';
  };

  if (!yamlList) {
    return jsonRes(res, {
      code: ResponseCode.BAD_REQUEST,
      message: 'yaml list is empty'
    });
  }

  const { applyYamlList } = await getK8s({
    kubeconfig: await authSession(req.headers)
  });

  const applyRes = await applyYamlList(yamlList, type);

  jsonRes(res, { data: applyRes.map((item) => item.kind) });
});
