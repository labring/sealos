import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import { NextApiRequest, NextApiResponse } from 'next';
import { ResponseCode, ResponseMessages } from '@/types/response';
import { getDatabaseSchemas, updateDatabaseSchemas } from '@/types/apis/v2alpha';
import { updateDatabase } from '@/services/backend/v2alpha/update-database';
import { getDatabase } from '@/services/backend/v2alpha/get-database';
import { deleteDatabase } from '@/services/backend/v2alpha/delete-database';

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
          message:
            'Invalid request body. ' +
            bodyParseResult.error.issues.map((i) => i.message).join(', '),
          error: bodyParseResult.error.issues
        });
      }

      const { quota } = bodyParseResult.data;
      const validCpuValues = [1, 2, 3, 4, 5, 6, 7, 8];
      const validMemoryValues = [1, 2, 4, 6, 8, 12, 16, 32];
      if (quota.cpu !== undefined && !validCpuValues.includes(quota.cpu)) {
        return res.status(400).json({
          error: `Invalid CPU value. Must be one of: cores (minimum 1 core)`
        });
      }

      if (quota.memory !== undefined && !validMemoryValues.includes(quota.memory)) {
        return res.status(400).json({
          error: `Invalid memory value. Must be one of GB (minimum 1 GB)`
        });
      }

      if (quota.storage !== undefined && (quota.storage < 1 || quota.storage > 300)) {
        return res.status(400).json({
          error: 'Invalid storage value. Must be between 1 and 300 GB'
        });
      }

      if (quota.replicas !== undefined && (quota.replicas < 1 || quota.replicas > 20)) {
        return res.status(400).json({
          error: 'Invalid replicas value. Must be between 1 and 20'
        });
      }
      await updateDatabase(k8s, {
        params: pathParamsParseResult.data,
        body: bodyParseResult.data
      });

      return res.status(204).end();
    } catch (err: any) {
      const errorResponse = handleK8sError(err);
      return jsonRes(res, errorResponse);
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
      const errorResponse = handleK8sError(err);
      return jsonRes(res, errorResponse);
    }
  } else if (req.method === 'DELETE') {
    try {
      await deleteDatabase(k8s, {
        params: pathParamsParseResult.data
      });

      return res.status(204).end();
    } catch (err: any) {
      const errorResponse = handleK8sError(err);
      return jsonRes(res, errorResponse);
    }
  } else {
    return res.status(405).json({
      error: 'Method not allowed'
    });
  }
}
