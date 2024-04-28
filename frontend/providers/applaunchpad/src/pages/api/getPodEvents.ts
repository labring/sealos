import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  const reqNamespace = req.query.namespace as string;
  try {
    const { podName } = req.query as { podName: string };

    if (!podName) {
      throw new Error('podName is empty');
    }

    const { k8sCore, namespace } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    // get pods event list
    const { body: data } = await k8sCore.listNamespacedEvent(
      reqNamespace,
      undefined,
      undefined,
      undefined,
      `involvedObject.name=${podName}`
    );

    jsonRes(res, {
      data
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
