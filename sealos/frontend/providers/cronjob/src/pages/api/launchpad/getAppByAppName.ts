import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { appName } = req.query as { appName: string };

    if (!appName) {
      throw new Error('appName is empty');
    }

    const { k8sApp, namespace } = await getK8s({
      kubeconfig: await authSession(req)
    });

    const response = await k8sApp.readNamespacedDeployment(appName, namespace);

    jsonRes(res, {
      data: response.body
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
