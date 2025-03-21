import { authSession, getAdminAuthorization } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';

export async function createConfigMap(k8sCore: any, ns: string, name: string, data: any) {
    const configMap = {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: {
        name: name,
        namespace: ns
        },
        data: {
        ...data
        }
    };

    console.log('configMap:', configMap);
    
    return await k8sCore.createNamespacedConfigMap(ns, configMap);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { k8sCore } = await getK8s({
          kubeconfig: await authSession(req.headers)
        // kubeconfig: await getAdminAuthorization(req.headers)
    });

    const name = process.env.GLOBAL_CONFIGMAP_NAME || 'global-configmap';

    const namespace = "default";

    createConfigMap(k8sCore, namespace, name, {});    

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
