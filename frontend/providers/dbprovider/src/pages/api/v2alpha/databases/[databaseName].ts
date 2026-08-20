import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { NextApiRequest, NextApiResponse } from 'next';
import { getDatabaseSchemas, updateDatabaseSchemas } from '@/types/apis/v2alpha';
import { updateDatabase } from '@/services/backend/v2alpha/update-database';
import { getDatabase } from '@/services/backend/v2alpha/get-database';
import { deleteDatabase } from '@/services/backend/v2alpha/delete-database';
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

  const pathParamsParseResult = getDatabaseSchemas.pathParams.safeParse(req.query);
  if (!pathParamsParseResult.success) {
    return sendValidationError(res, pathParamsParseResult.error, 'Invalid request parameters.');
  }

  const databaseName = pathParamsParseResult.data.databaseName;

  if (req.method === 'PATCH') {
    try {
      const bodyParseResult = updateDatabaseSchemas.body.safeParse(req.body);
      if (!bodyParseResult.success) {
        return sendValidationError(res, bodyParseResult.error, 'Invalid request body.');
      }

      const { quota } = bodyParseResult.data;
      const validCpuValues = [1, 2, 3, 4, 5, 6, 7, 8];
      const validMemoryValues = [1, 2, 4, 6, 8, 12, 16, 32];
      if (quota.cpu !== undefined && !validCpuValues.includes(quota.cpu)) {
        return sendError(res, {
          status: 400,
          type: ErrorType.VALIDATION_ERROR,
          code: ErrorCode.INVALID_VALUE,
          message: 'Invalid CPU value. Must be one of: 1, 2, 3, 4, 5, 6, 7, 8 cores.'
        });
      }

      if (quota.memory !== undefined && !validMemoryValues.includes(quota.memory)) {
        return sendError(res, {
          status: 400,
          type: ErrorType.VALIDATION_ERROR,
          code: ErrorCode.INVALID_VALUE,
          message: 'Invalid memory value. Must be one of: 1, 2, 4, 6, 8, 12, 16, 32 GB.'
        });
      }

      if (quota.storage !== undefined && (quota.storage < 1 || quota.storage > 300)) {
        return sendError(res, {
          status: 400,
          type: ErrorType.VALIDATION_ERROR,
          code: ErrorCode.INVALID_VALUE,
          message: 'Invalid storage value. Must be between 1 and 300 GB.'
        });
      }

      if (quota.replicas !== undefined && (quota.replicas < 1 || quota.replicas > 20)) {
        return sendError(res, {
          status: 400,
          type: ErrorType.VALIDATION_ERROR,
          code: ErrorCode.INVALID_VALUE,
          message: 'Invalid replicas value. Must be between 1 and 20.'
        });
      }

      await updateDatabase(k8s, {
        params: pathParamsParseResult.data,
        body: bodyParseResult.data
      });

      return res.status(204).end();
    } catch (err: any) {
      const body = err?.body ?? err;
      if (body?.code === 404) {
        return sendError(res, {
          status: 404,
          type: ErrorType.RESOURCE_ERROR,
          code: ErrorCode.NOT_FOUND,
          message: `Database '${databaseName}' not found.`,
          details: body.message
        });
      }
      return sendK8sError(res, err);
    }
  } else if (req.method === 'GET') {
    try {
      const result = await getDatabase(k8s, {
        params: pathParamsParseResult.data
      });

      if (result && typeof result === 'object' && 'id' in result) {
        const { id, ...rest } = result as Record<string, any>;
        return res.json({
          uid: id,
          ...rest
        });
      }

      return res.json(result);
    } catch (err: any) {
      const body = err?.body ?? err;
      if (body?.code === 404) {
        return sendError(res, {
          status: 404,
          type: ErrorType.RESOURCE_ERROR,
          code: ErrorCode.NOT_FOUND,
          message: `Database '${databaseName}' not found.`,
          details: body.message
        });
      }
      return sendK8sError(res, err);
    }
  } else if (req.method === 'DELETE') {
    try {
      await deleteDatabase(k8s, {
        params: pathParamsParseResult.data
      });

      return res.status(204).end();
    } catch (err: any) {
      const body = err?.body ?? err;
      if (body?.code === 404) {
        return res.status(204).end();
      }
      return sendK8sError(res, err);
    }
  } else {
    return sendError(res, {
      status: 405,
      type: ErrorType.CLIENT_ERROR,
      code: ErrorCode.METHOD_NOT_ALLOWED,
      message: 'Method not allowed. Use GET, PATCH, or DELETE.'
    });
  }
}
