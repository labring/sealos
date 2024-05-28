import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';

export const NODE_TLS_REJECT_UNAUTHORIZED = 0;

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { k8sApp, namespace, k8sCore } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });
    const result = await k8sCore.listNamespace();
    const namespacesList = result.body.items.map((item: any) => item.metadata.name);
    jsonRes(res, {
      data: namespacesList
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
