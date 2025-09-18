import type { NextApiRequest, NextApiResponse } from 'next';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import { ResponseCode, ResponseMessages } from '@/types/response';

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

  if (req.method === 'DELETE') {
    try {
      const serviceName = `${databaseName}-export`;

      let serviceExists = false;
      try {
        const { body: service } = await k8s.k8sCore.readNamespacedService(
          serviceName,
          k8s.namespace
        );
        serviceExists = !!service;
      } catch (checkErr: any) {
        const isNotFound =
          checkErr?.response?.statusCode === 404 ||
          checkErr?.statusCode === 404 ||
          checkErr?.body?.code === 404 ||
          (checkErr?.body?.code && +checkErr?.body?.code === 404) ||
          checkErr?.body?.reason === 'NotFound' ||
          checkErr?.message?.includes('not found');

        if (isNotFound) {
          return jsonRes(res, {
            code: 404,
            message: 'Public access not enabled for this database'
          });
        }

        throw checkErr;
      }

      try {
        const deleteResult = await k8s.k8sCore.deleteNamespacedService(serviceName, k8s.namespace);

        return jsonRes(res, {
          code: 200,
          message: 'Public access disabled successfully',
          data: {
            dbName: databaseName,
            serviceName,
            operation: 'disable-public-access',
            deletedAt: new Date().toISOString()
          }
        });
      } catch (deleteErr: any) {
        const isNotFound =
          deleteErr?.response?.statusCode === 404 ||
          deleteErr?.statusCode === 404 ||
          deleteErr?.body?.code === 404 ||
          (deleteErr?.body?.code && +deleteErr?.body?.code === 404) ||
          deleteErr?.body?.reason === 'NotFound' ||
          deleteErr?.message?.includes('not found');

        if (isNotFound) {
          return jsonRes(res, {
            code: 200,
            message: 'Public access disabled successfully',
            data: {
              dbName: databaseName,
              serviceName,
              operation: 'disable-public-access',
              deletedAt: new Date().toISOString()
            }
          });
        }

        throw deleteErr;
      }
    } catch (err: any) {
      return jsonRes(res, handleK8sError(err));
    }
  }

  return jsonRes(res, {
    code: 405,
    message: 'Method not allowed'
  });
}
