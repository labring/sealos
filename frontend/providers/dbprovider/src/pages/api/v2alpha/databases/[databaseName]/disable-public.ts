import type { NextApiRequest, NextApiResponse } from 'next';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
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
      const serviceName = `${databaseName}-export`;

      try {
        await k8s.k8sCore.readNamespacedService(serviceName, k8s.namespace);
      } catch (checkErr: any) {
        const isNotFound =
          checkErr?.response?.statusCode === 404 ||
          checkErr?.statusCode === 404 ||
          checkErr?.body?.code === 404 ||
          (checkErr?.body?.code && +checkErr?.body?.code === 404) ||
          checkErr?.body?.reason === 'NotFound' ||
          checkErr?.message?.includes('not found');

        if (isNotFound) {
          return sendError(res, {
            status: 404,
            type: ErrorType.RESOURCE_ERROR,
            code: ErrorCode.NOT_FOUND,
            message: 'Public access not enabled for this database.'
          });
        }

        throw checkErr;
      }

      try {
        await k8s.k8sCore.deleteNamespacedService(serviceName, k8s.namespace);

        return res.status(204).end();
      } catch (deleteErr: any) {
        const isNotFound =
          deleteErr?.response?.statusCode === 404 ||
          deleteErr?.statusCode === 404 ||
          deleteErr?.body?.code === 404 ||
          (deleteErr?.body?.code && +deleteErr?.body?.code === 404) ||
          deleteErr?.body?.reason === 'NotFound' ||
          deleteErr?.message?.includes('not found');

        if (isNotFound) {
          return res.status(204).end();
        }

        throw deleteErr;
      }
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
