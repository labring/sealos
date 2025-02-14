import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const kubeconfig = await authSession(req.headers);
    const { k8sCore, kube_user } = await getK8s({ kubeconfig });
    let resourceQuotasList: { namespace: string, name: string, cpu: string, memory: string, storage: string, services: string, persistentvolumeclaims: string }[] = [];

    if (kube_user.name === 'kubernetes-admin') {
      const namespacesResult = await k8sCore.listNamespace();
      const namespaces = namespacesResult.body.items.map((item: any) => item.metadata.name);

      for (const ns of namespaces) {
        const resourceQuotaResult = await k8sCore.listNamespacedResourceQuota(ns);
        resourceQuotaResult.body.items.forEach((item: any) => {
          resourceQuotasList.push({
            namespace: ns,
            name: item.metadata.name,
            cpu: item.spec.hard['limits.cpu'],
            memory: item.spec.hard['limits.memory'],
            storage: item.spec.hard['requests.storage'],
            services: item.spec.hard['services'],
            persistentvolumeclaims: item.spec.hard['persistentvolumeclaims']
          });
        });
      }
    } else {
      throw new Error('Permission denied');
    }

    jsonRes(res, {
      data: resourceQuotasList
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
