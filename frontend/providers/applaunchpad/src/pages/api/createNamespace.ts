import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { k8sCore } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const { ns } = req.body as {
      ns: string;
    };

    const temp = {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: {
        name: ns
      }
    };

    const result = await k8sCore.createNamespace(temp);

    jsonRes(res, {
      data: result
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
