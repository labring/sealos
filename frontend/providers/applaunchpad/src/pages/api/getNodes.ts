import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';

export const NODE_TLS_REJECT_UNAUTHORIZED = 0;

export interface NodeInfo {
  name: string;
  status: string;
  roles: string;
  version: string;
  internalIP: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { k8sApp, namespace, k8sCore } = await getK8s({
      kubeconfig: await authSession(req.headers)
    });
    const result = await k8sCore.listNode();

    const nodesList: NodeInfo[] = result.body.items.map((item: any) => ({
      name: item.metadata.name,
      status: item.status.conditions.find((condition: any) => condition.type === 'Ready').status,
      roles: item.metadata.labels['kubernetes.io/role'] || 'worker',
      version: item.status.nodeInfo.kubeletVersion,
      internalIP: item.status.addresses.find((address: any) => address.type === 'InternalIP')
        .address
    }));

    jsonRes(res, {
      data: nodesList
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
