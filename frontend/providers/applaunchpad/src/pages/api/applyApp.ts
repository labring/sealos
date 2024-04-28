import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  const namespace = req.query.namespace as string;
  const { yamlList }: { yamlList: string[] } = req.body;
  console.log(req.body);
  console.log(yamlList);
  console.log(namespace);
  if (!yamlList || yamlList.length < 2) {
    jsonRes(res, {
      code: 500,
      error: 'params error'
    });
    return;
  }
  try {
    const { applyYamlList } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const applyRes = await applyYamlList(yamlList, 'create', namespace);

    jsonRes(res, { data: applyRes.map((item) => item.kind) });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
