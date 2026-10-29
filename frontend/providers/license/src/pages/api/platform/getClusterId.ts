import { authSession } from '@/services/backend/auth';
import { K8sApiDefault, getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import * as k8s from '@kubernetes/client-node';
import { Decimal } from 'decimal.js';
import type { NextApiRequest, NextApiResponse } from 'next';

export type TSystemInfo = {
  systemId: string;
  nodeCount: number;
  totalWorkspaces: number;
  totalCpu: string;
  totalMemory: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const defaultKc = K8sApiDefault();

    const result = await defaultKc
      .makeApiClient(k8s.CoreV1Api)
      .readNamespace({ name: 'kube-system' });
    const systemId = result?.metadata?.uid?.substring(0, 8) || '';

    const nodesResult = await defaultKc.makeApiClient(k8s.CoreV1Api).listNode({});
    const nodeCount = nodesResult.items.length;

    // Fetch users (workspaces) count, requesting only metadata to avoid large status payloads
    const usersResult = await defaultKc
      .makeApiClient(k8s.CustomObjectsApi)
      .listClusterCustomObject(
        { group: 'user.sealos.io', version: 'v1', plural: 'users' },
        {
          middleware: [
            {
              pre: (context) =>
                new k8s.Observable(
                  Promise.resolve(context).then((ctx) => {
                    ctx.setHeaderParam(
                      'Accept',
                      'application/json;as=PartialObjectMetadataList;v=v1;g=meta.k8s.io,application/json'
                    );
                    return ctx;
                  })
                ),
              post: (context) => new k8s.Observable(Promise.resolve(context))
            }
          ]
        }
      );
    const totalWorkspaces = (usersResult as any)?.items?.length || 0;

    let totalCpu = new Decimal(0);
    let totalMemoryKi = new Decimal(0);

    nodesResult.items.forEach((node: k8s.V1Node) => {
      if (!node?.status?.capacity) return;
      const cpu = new Decimal(node.status.capacity.cpu);
      const memoryKi = new Decimal(node.status.capacity.memory.replace('Ki', ''));
      totalCpu = totalCpu.plus(cpu);
      totalMemoryKi = totalMemoryKi.plus(memoryKi);
    });
    const totalMemoryGB = totalMemoryKi.dividedBy(Decimal.pow(2, 20)).ceil(); // 1 GB = 2^20 Ki

    jsonRes<TSystemInfo>(res, {
      data: {
        systemId: systemId,
        nodeCount: nodeCount,
        totalWorkspaces: totalWorkspaces,
        totalCpu: totalCpu.toString(),
        totalMemory: totalMemoryGB.toString()
      }
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
