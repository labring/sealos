import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  const { kc, k8sCore, namespace } = await getK8s({
    kubeconfig: await authSession(req)
  });

  console.log(namespace);

  const {
    podName,
    containerName,
    stream = false,
    logSize,
    previous,
    sinceTime
  } = req.body as {
    containerName: string;
    podName: string;
    stream: boolean;
    logSize?: number;
    previous?: boolean;
    sinceTime?: number;
  };

  if (!podName) {
    throw new Error('podName is empty');
  }

  if (!stream) {
    const sinceSeconds =
      sinceTime && !!!previous ? Math.floor((Date.now() - sinceTime) / 1000) : undefined;
    try {
      const { body: data } = await k8sCore.readNamespacedPodLog(
        podName,
        namespace,
        containerName,
        undefined,
        undefined,
        undefined,
        undefined,
        previous,
        sinceSeconds,
        logSize
      );
      return jsonRes(res, {
        data
      });
    } catch (error: any) {
      jsonRes(res, {
        code: 500,
        error
      });
    }
  }
}
