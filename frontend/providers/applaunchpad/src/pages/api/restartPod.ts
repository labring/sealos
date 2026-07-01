import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import { ResponseCode } from '@/types/response';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { podName } = req.query as { podName: string };
    if (!podName) {
      throw new Error('podName is empty');
    }
    const { k8sCore, namespace } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    await k8sCore.deleteNamespacedPod(podName, namespace);

    jsonRes(res);
  } catch (err: any) {
    jsonRes(res, handleK8sError(err, { forbiddenCode: ResponseCode.FORBIDDEN }));
  }
}
