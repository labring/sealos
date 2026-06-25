import { NextApiRequest, NextApiResponse } from 'next';
import { authSession } from '@/services/backend/auth';
import { deleteBackupAndCleanupRepoPVC } from '@/services/backend/backupCleanup';
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

  const { databaseName, backupName } = req.query as {
    databaseName: string;
    backupName: string;
  };

  if (!databaseName || !backupName) {
    return sendError(res, {
      status: 400,
      type: ErrorType.VALIDATION_ERROR,
      code: ErrorCode.INVALID_PARAMETER,
      message: 'Database name and backup name are required.'
    });
  }

  if (req.method === 'DELETE') {
    try {
      await deleteBackupAndCleanupRepoPVC({
        backupName,
        k8sCore: k8s.k8sCore,
        k8sCustomObjects: k8s.k8sCustomObjects,
        namespace: k8s.namespace
      });

      return res.status(204).end();
    } catch (err: any) {
      if (err?.response?.statusCode === 404) {
        return res.status(204).end();
      }
      return sendK8sError(res, err);
    }
  }

  return sendError(res, {
    status: 405,
    type: ErrorType.CLIENT_ERROR,
    code: ErrorCode.METHOD_NOT_ALLOWED,
    message: 'Method not allowed. Use DELETE.'
  });
}
