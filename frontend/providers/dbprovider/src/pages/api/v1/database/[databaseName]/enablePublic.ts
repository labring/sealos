import type { NextApiRequest, NextApiResponse } from 'next';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import { ResponseCode, ResponseMessages } from '@/types/response';
import { adaptDBDetail } from '@/utils/adapt';
import { KbPgClusterType } from '@/types/cluster';
import { json2NetworkService } from '@/utils/json2Yaml';
import yaml from 'js-yaml';

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
    return jsonRes(res, {
      code: 400,
      message: 'Database name is required'
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
        return jsonRes(res, {
          code: 404,
          message: 'Database not found'
        });
      }

      const serviceName = `${databaseName}-export`;

      try {
        const existingService = await k8s.k8sCore.readNamespacedService(serviceName, k8s.namespace);
        const nodePort = existingService?.body?.spec?.ports?.[0]?.nodePort;
        const port = existingService?.body?.spec?.ports?.[0]?.port;

        return jsonRes(res, {
          code: 200,
          message: 'Public access already enabled',
          data: {
            dbName: databaseName,
            serviceName,
            operation: 'enable-public-access',
            nodePort,
            port,
            alreadyExists: true,
            createdAt: existingService.body.metadata?.creationTimestamp || new Date().toISOString()
          }
        });
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

      const createResult = await k8s.applyYamlList([serviceYaml], 'create');

      let createdService;
      let nodePort;
      for (let i = 0; i < 5; i++) {
        try {
          createdService = await k8s.k8sCore.readNamespacedService(serviceName, k8s.namespace);
          nodePort = createdService?.body?.spec?.ports?.[0]?.nodePort;

          if (nodePort) {
            break;
          }

          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (err) {
          if (i === 4) throw err;
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      const serviceConfig = yaml.load(serviceYaml) as any;
      const servicePort = serviceConfig?.spec?.ports?.[0]?.port;

      const responseData = {
        dbName: databaseName,
        serviceName,
        operation: 'enable-public-access',
        nodePort: nodePort || null,
        port: servicePort,
        createdAt: new Date().toISOString()
      };

      return jsonRes(res, {
        code: 200,
        message: 'Public access enabled successfully',
        data: responseData
      });
    } catch (err: any) {
      return jsonRes(res, handleK8sError(err));
    }
  }

  return jsonRes(res, {
    code: 405,
    message: 'Method not allowed'
  });
}
