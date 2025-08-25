import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { name } = req.query as { name: string };
    if (!name) {
      throw new Error('name is empty');
    }

    const { k8sCore, namespace } = await getK8s({
      kubeconfig: await authSession(req)
    });

    const { body } = await k8sCore.readNamespacedService(name, namespace);

    jsonRes(res, {
      data: body
    });
  } catch (err: any) {
    if (err?.body?.code === 404) {
      return jsonRes(res);
    }
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
