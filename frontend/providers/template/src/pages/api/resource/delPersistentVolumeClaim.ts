import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { K8sApi, getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { instanceName } = req.query as { instanceName: string };
    if (!instanceName) {
      throw new Error('pvc name is empty');
    }

    const { namespace, k8sCore } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    // 删除 pvc
    const result = await k8sCore.deleteNamespacedPersistentVolumeClaim(instanceName, namespace);
    jsonRes(res, { data: result });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
