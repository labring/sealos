import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';

interface Limits {
	services: string;
	requestsStorage: string;
	persistentVolumeClaims: string;
	limitsCpu: string;
	limitsMemory: string;
}

interface RequestBody {
	namespace: string;
	roleId:any;
	username?: string; // Optional, if not provided, it will be inferred from the session
	limits: Limits;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
	try {
		const { k8sCore } = await getK8s({
			kubeconfig: await authSession(req.headers)
		});

		const { namespace, limits } = req.body as RequestBody;

		const resourceQuota = {
			apiVersion: 'v1',
			kind: 'ResourceQuota',
			metadata: {
				name: 'quota',
				namespace: namespace,
				annotations: {
					'sealos/username': req.body.username || namespace,
					'sealos/roleId': req.body.roleId || null,
				}
			},
			spec: {
				hard: {
					'services': limits.services,
					'requests.storage': limits.requestsStorage,
					'persistentvolumeclaims': limits.persistentVolumeClaims,
					'limits.cpu': limits.limitsCpu,
					'limits.memory': limits.limitsMemory
				}
			}
		};

		const resourceQuotaResult = await k8sCore.replaceNamespacedResourceQuota('quota', namespace, resourceQuota);

		jsonRes(res, {
			data: resourceQuotaResult
		});
	} catch (err: any) {
		jsonRes(res, {
			code: 500,
			error: err
		});
	}
}