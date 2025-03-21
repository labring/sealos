import { authSession, getAdminAuthorization } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { k8sCore } = await getK8s({
      kubeconfig: await authSession(req.headers)
        // kubeconfig: await getAdminAuthorization(req.headers)
    });

    const { data } = req.body as {
        data: any;
    };

    const name = process.env.GLOBAL_CONFIGMAP_NAME || 'global-configmap';

    const namespace = "default";
    
    const configMap = {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: {
        name: name,
        namespace: namespace
        },
        data: {
        ...data
        }
    };

    // update the ConfigMap
    await k8sCore.replaceNamespacedConfigMap(name, namespace, configMap); 

    jsonRes(res, {
        data: {
            message: 'successfully created'
        }
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
