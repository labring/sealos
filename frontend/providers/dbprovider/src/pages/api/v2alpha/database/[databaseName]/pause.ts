import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { pauseDatabaseSchemas } from '@/types/apis/v2alpha';
import { NextApiRequest, NextApiResponse } from 'next';
import { pauseDatabase } from '@/services/backend/v2alpha/pause-database';
import {
  sendError,
  sendK8sError,
  sendValidationError,
  ErrorType,
  ErrorCode
} from '@/types/v2alpha/error';

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

  if (req.method === 'POST') {
    try {
      const pathParamsParseResult = pauseDatabaseSchemas.pathParams.safeParse(req.query);
      if (!pathParamsParseResult.success) {
        return sendValidationError(res, pathParamsParseResult.error, 'Invalid request parameters.');
      }

      await pauseDatabase(
        k8s,
        {
          params: pathParamsParseResult.data
        },
        req
      );

      return res.status(204).end();
    } catch (error) {
      return sendK8sError(res, error);
    }
  }

  return sendError(res, {
    status: 405,
    type: ErrorType.CLIENT_ERROR,
    code: ErrorCode.METHOD_NOT_ALLOWED,
    message: 'Method not allowed. Use POST.'
  });
}
