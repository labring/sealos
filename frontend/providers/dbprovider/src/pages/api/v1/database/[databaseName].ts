import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import { NextApiRequest, NextApiResponse } from 'next';
import { ResponseCode, ResponseMessages } from '@/types/response';
import { createDatabaseSchemas, getDatabaseSchemas, updateDatabaseSchemas } from '@/types/apis';
import { updateDatabase } from '@/services/backend/apis/update-database';
import { getDatabase } from '@/services/backend/apis/get-database';
import path from 'node:path/win32';
import { deleteDatabase } from '@/services/backend/apis/delete-database';

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
  const pathParamsParseResult = getDatabaseSchemas.pathParams.safeParse(req.query);
  if (!pathParamsParseResult.success) {
    return jsonRes(res, {
      code: ResponseCode.BAD_REQUEST,
      message: ResponseMessages[ResponseCode.BAD_REQUEST],
      error: pathParamsParseResult.error.issues
    });
  }
  if (req.method === 'PATCH') {
    try {
      const bodyParseResult = updateDatabaseSchemas.body.safeParse(req.body);
      if (!bodyParseResult.success) {
        return jsonRes(res, {
          code: 400,
          message: 'Invalid request body.',
          error: bodyParseResult.error.issues
        });
      }

      const result = await updateDatabase(k8s, {
        params: pathParamsParseResult.data,
        body: bodyParseResult.data
      });

      return jsonRes(res, result);
    } catch (err) {
      console.log('error update db', err);
      jsonRes(res, handleK8sError(err));
    }
  } else if (req.method === 'GET') {
    try {
      const pathParamsParseResult = getDatabaseSchemas.pathParams.safeParse(req.query);
      if (!pathParamsParseResult.success) {
        return jsonRes(res, {
          code: ResponseCode.BAD_REQUEST,
          message: ResponseMessages[ResponseCode.BAD_REQUEST],
          error: pathParamsParseResult.error.issues
        });
      }
      const result = await getDatabase(k8s, {
        params: pathParamsParseResult.data
      });
      jsonRes(res, {
        data: result
      });
    } catch (err) {
      console.log('error get db by name', err);
      jsonRes(res, handleK8sError(err));
    }
  } else if (req.method === 'DELETE') {
    try {
      await deleteDatabase(k8s, {
        params: pathParamsParseResult.data
      });
      jsonRes(res, {
        data: `Successfully deleted`
      });
    } catch (err) {
      console.log('error delete db', err);
      jsonRes(res, handleK8sError(err));
    }
  } else {
    return jsonRes(res, {
      code: 405,
      message: 'Method not allowed'
    });
  }
}
