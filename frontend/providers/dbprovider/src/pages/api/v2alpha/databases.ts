import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { NextApiRequest, NextApiResponse } from 'next';
import { createDatabaseSchemas } from '@/types/apis/v2alpha';
import { createDatabase } from '@/services/backend/v2alpha/create-database';
import { getDatabaseList } from '@/services/backend/v2alpha/list-database';
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
      const bodyParseResult = createDatabaseSchemas.body.safeParse(req.body);
      if (!bodyParseResult.success) {
        return sendValidationError(res, bodyParseResult.error, 'Invalid request body.');
      }

      await createDatabase(k8s, {
        body: bodyParseResult.data
      });

      return res.status(201).json({ name: bodyParseResult.data.name, status: 'creating' });
    } catch (err: any) {
      if (err.response || err.body) {
        return sendK8sError(res, err);
      }
      return sendError(res, {
        status: 500,
        type: ErrorType.INTERNAL_ERROR,
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Internal server error.',
        details: err?.message
      });
    }
  }

  if (req.method === 'GET') {
    try {
      const { dbName } = req.query;

      const list = await getDatabaseList(k8s);
      const targetName = Array.isArray(dbName) ? dbName[0] : dbName;
      const filtered = targetName ? list.filter((item) => item.name === targetName) : list;
      const simplified = filtered.map(
        ({ name, id, type, version, quota, resourceType, status }) => ({
          name,
          uid: id,
          type,
          version,
          quota,
          resourceType,
          status
        })
      );

      return res.status(200).json(simplified);
    } catch (err: any) {
      return sendK8sError(res, err);
    }
  }

  return sendError(res, {
    status: 405,
    type: ErrorType.CLIENT_ERROR,
    code: ErrorCode.METHOD_NOT_ALLOWED,
    message: 'Method not allowed. Use GET or POST.'
  });
}
