import type { NextApiRequest, NextApiResponse } from 'next';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { adaptDBDetail } from '@/utils/adapt';
import { KbPgClusterType } from '@/types/cluster';
import { json2NetworkService } from '@/utils/json2Yaml';
import { sendError, sendK8sError, ErrorType, ErrorCode } from '@/types/v2alpha/error';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const kubeconfig = await authSession(req).catch(() => null);
  if (!kubeconfig) {
    return sendError(res, {
      status: 401,
      type: ErrorType.AUTHENTICATION_ERROR,
      code: ErrorCode.AUTHENTICATION_REQUIRED,
      message: 'Unauthorized, please login again.'
    });
  }

  const k8s = await getK8s({ kubeconfig }).catch(() => null);
  if (!k8s) {
    return sendError(res, {
      status: 401,
      type: ErrorType.AUTHENTICATION_ERROR,
      code: ErrorCode.AUTHENTICATION_REQUIRED,
      message: 'Unauthorized, please login again.'
    });
  }

  const { databaseName } = req.query as { databaseName: string };

  if (!databaseName) {
    return sendError(res, {
      status: 400,
      type: ErrorType.VALIDATION_ERROR,
      code: ErrorCode.INVALID_PARAMETER,
      message: 'Database name is required.'
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
        return sendError(res, {
          status: 404,
          type: ErrorType.RESOURCE_ERROR,
          code: ErrorCode.NOT_FOUND,
          message: 'Database not found.'
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
      return sendK8sError(res, err);
    }
  }

  return sendError(res, {
    status: 405,
    type: ErrorType.CLIENT_ERROR,
    code: ErrorCode.METHOD_NOT_ALLOWED,
    message: 'Method not allowed. Use POST.'
  });
}
