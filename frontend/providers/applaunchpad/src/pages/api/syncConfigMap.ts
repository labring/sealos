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

    const name = process.env.GLOBAL_CONFIGMAP_NAME || 'global-configmap';

    const namespace = "default";
    
    // read the ConfigMap
    const configMap = await k8sCore.readNamespacedConfigMap(name, namespace);

    let result = await k8sCore.listNamespace();
    let namespacesList = result.body.items.map((item: any) => item.metadata.name);

    // update the ConfigMap for all namespaces
    for (let ns of namespacesList) {
        if (ns === 'default' || 
            ns === 'kube-system' || 
            ns ==='sealos' || 
            ns === 'cert-manager' || 
            ns === 'ingress-nginx' ||
            ns === 'calico-apiserver' ||
            ns === 'calico-system' ||
            ns === 'kube-node-lease' ||
            ns === 'kube-public' ||
            ns === 'loki' ||
            ns === 'loki-stack' ||
            ns === 'openebs' ||
            ns === 'ops-monit' ||
            ns === 'tigera-operator' ||
            ns === 'vm') {
            continue;
        }
        const new_configMap = {
            apiVersion: 'v1',
            kind: 'ConfigMap',
            metadata: {
            name: name,
            namespace: ns
            },
            data: {
            ...configMap.body.data
            }
        };
        try {
            await k8sCore.replaceNamespacedConfigMap(name, ns, new_configMap);
        } catch (err: any) {
            await k8sCore.createNamespacedConfigMap(ns, new_configMap);
        }
    }

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
