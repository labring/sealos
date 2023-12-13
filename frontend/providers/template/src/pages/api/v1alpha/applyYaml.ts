import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  const { yamlList } = req.body as {
    yamlList: string[];
  };

  if (!yamlList) {
    return jsonRes(res, {
      code: 500,
      error: 'yaml list is empty'
    });
  }

  try {
    const { applyYamlList } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const applyRes = await applyYamlList(yamlList, 'create');

    jsonRes(res, { data: applyRes.map((item) => item.kind), message: 'success' });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
