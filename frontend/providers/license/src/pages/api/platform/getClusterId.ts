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

    const result = await defaultKc.makeApiClient(k8s.CoreV1Api).readNamespace('kube-system');
    const systemId = result?.body?.metadata?.uid?.substring(0, 8) || '';

    const nodesResult = await defaultKc.makeApiClient(k8s.CoreV1Api).listNode();
    const nodeCount = nodesResult.body.items.length;

    // Fetch users (workspaces) count, requesting only metadata to avoid large status payloads
    // @ts-ignore
    const usersResult = await defaultKc
      .makeApiClient(k8s.CustomObjectsApi)
      .listClusterCustomObject(
        'user.sealos.io',
        'v1',
        'users',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        {
          headers: {
            Accept:
              'application/json;as=PartialObjectMetadataList;v=v1;g=meta.k8s.io,application/json'
          }
        }
      );
    // @ts-ignore
    const totalWorkspaces = usersResult?.body?.items?.length || 0;

    let totalCpu = new Decimal(0);
    let totalMemoryKi = new Decimal(0);

    nodesResult.body.items.forEach((node) => {
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
