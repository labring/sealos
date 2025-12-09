import type { NextApiRequest, NextApiResponse } from 'next';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import { ResponseCode, ResponseMessages } from '@/types/response';
import { adaptDBDetail } from '@/utils/adapt';
import { KbPgClusterType } from '@/types/cluster';
import { json2NetworkService } from '@/utils/json2Yaml';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const kubeconfig = await authSession(req).catch(() => null);
  if (!kubeconfig) {
    return jsonRes(res, {
      code: ResponseCode.UNAUTHORIZED,
      message: ResponseMessages[ResponseCode.UNAUTHORIZED]
    });
  }

  const k8s = await getK8s({ kubeconfig }).catch(() => null);
  if (!k8s) {
    return jsonRes(res, {
      code: ResponseCode.UNAUTHORIZED,
      message: ResponseMessages[ResponseCode.UNAUTHORIZED]
    });
  }

  const { databaseName } = req.query as { databaseName: string };

  if (!databaseName) {
    return res.status(400).json({
      error: 'Database name is required'
    });
  }

  if (req.method === 'POST') {
    try {
      const { body: clusterData } = (await k8s.k8sCustomObjects.getNamespacedCustomObject(
        'apps.kubeblocks.io',
        'v1alpha1',
        k8s.namespace,
        'clusters',
        databaseName
      )) as { body: KbPgClusterType };

      const dbDetail = adaptDBDetail(clusterData);

      if (!dbDetail) {
        return res.status(404).json({
          error: 'Database not found'
        });
      }

      const serviceName = `${databaseName}-export`;

      try {
        await k8s.k8sCore.readNamespacedService(serviceName, k8s.namespace);

        return res.status(204).end();
      } catch (checkErr: any) {}

      const mockStatefulSet = {
        apiVersion: 'apps.kubeblocks.io/v1alpha1',
        metadata: {
          name: databaseName,
          uid: clusterData.metadata?.uid || ''
        }
      };

      const serviceYaml = json2NetworkService({
        dbDetail,
        dbStatefulSet: mockStatefulSet as any
      });

      await k8s.applyYamlList([serviceYaml], 'create');

      for (let i = 0; i < 5; i++) {
        try {
          const createdService = await k8s.k8sCore.readNamespacedService(
            serviceName,
            k8s.namespace
          );
          const nodePort = createdService?.body?.spec?.ports?.[0]?.nodePort;

          if (nodePort) {
            break;
          }

          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (err) {
          if (i === 4) throw err;
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      return res.status(204).end();
    } catch (err: any) {
      return jsonRes(res, handleK8sError(err));
    }
  }

  return res.status(405).json({
    error: 'Method not allowed'
  });
}
