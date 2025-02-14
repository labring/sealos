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

	const { namespace } = req.query as { namespace: string };
	const resourceQuotaName = 'quota';

	const deleteResult = await k8sCore.deleteNamespacedResourceQuota(resourceQuotaName, namespace);

	jsonRes(res, {
	  data: deleteResult
	});
  } catch (err: any) {
	jsonRes(res, {
	  code: 500,
	  error: err
	});
  }
}