import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    if (!global.AppConfig.common.guideEnabled) return jsonRes(res, { data: null });
    const { k8sCore, namespace } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    const result = await k8sCore.readNamespacedConfigMap('recharge-gift', 'sealos');

    jsonRes(res, {
      data: result.body
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
