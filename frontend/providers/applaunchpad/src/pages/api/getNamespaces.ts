import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';

export const NODE_TLS_REJECT_UNAUTHORIZED = 0;

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const kubeconfig = await authSession(req.headers);
    const { k8sApp, namespace, k8sCore, kube_user } = await getK8s({ kubeconfig });
    let namespacesList = null;
    if (kube_user.name === 'kubernetes-admin' || kube_user.name === 'inClusterUser') {
      let result = await k8sCore.listNamespace();
      namespacesList = result.body.items.map((item: any) => item.metadata.name);
    } else {
      namespacesList = [namespace];
    }
    jsonRes(res, {
      data: namespacesList
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
