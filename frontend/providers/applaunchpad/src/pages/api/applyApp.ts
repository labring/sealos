import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { handleK8sError, jsonRes } from '@/services/backend/response';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  const { yamlList, mode = 'create' }: { yamlList: string[]; mode?: 'create' | 'replace' } =
    req.body;
  if (!yamlList) {
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

    const applyRes = await applyYamlList(yamlList, mode);

    jsonRes(res, { data: applyRes.map((item) => item.kind) });
  } catch (err: any) {
    console.log(err);
    jsonRes(res, handleK8sError(err));
  }
}
