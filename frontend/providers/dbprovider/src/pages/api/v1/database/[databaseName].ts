import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import { NextApiRequest, NextApiResponse } from 'next';
import { ResponseCode, ResponseMessages } from '@/types/response';
import { getDatabaseSchemas, updateDatabaseSchemas } from '@/types/apis';
import { updateDatabase } from '@/services/backend/apis/update-database';
import { getDatabase } from '@/services/backend/apis/get-database';
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
          message:
            'Invalid request body. ' +
            bodyParseResult.error.issues.map((i) => i.message).join(', '),
          error: bodyParseResult.error.issues
        });
      }

      const { resource } = bodyParseResult.data;
      const validCpuValues = [1, 2, 3, 4, 5, 6, 7, 8];
      const validMemoryValues = [1, 2, 4, 6, 8, 12, 16, 32];
      const validStorageValues = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];

      if (resource.cpu !== undefined && !validCpuValues.includes(resource.cpu)) {
        return jsonRes(res, {
          code: 400,
          message: `Invalid CPU value. Must be one of: ${validCpuValues.join(', ')} cores (minimum 1 core)`
        });
      }

      if (resource.memory !== undefined && !validMemoryValues.includes(resource.memory)) {
        return jsonRes(res, {
          code: 400,
          message: `Invalid memory value. Must be one of: ${validMemoryValues.join(', ')} GB (minimum 1 GB)`
        });
      }

      if (resource.storage !== undefined && !validStorageValues.includes(resource.storage)) {
        return jsonRes(res, {
          code: 400,
          message: `Invalid storage value. Must be one of: ${validStorageValues.join(', ')} GB`
        });
      }

      if (resource.replicas !== undefined && (resource.replicas < 3 || resource.replicas > 300)) {
        return jsonRes(res, {
          code: 400,
          message: 'Invalid replicas value. Must be between 3 and 300'
        });
      }

      // 调用更新数据库函数
      const result = await updateDatabase(k8s, {
        params: pathParamsParseResult.data,
        body: bodyParseResult.data
      });

      return jsonRes(res, result);
    } catch (err: any) {
      const errorResponse = handleK8sError(err);
      return jsonRes(res, errorResponse);
    }
  } else if (req.method === 'GET') {
    try {
      const result = await getDatabase(k8s, {
        params: pathParamsParseResult.data
      });

      return jsonRes(res, {
        code: 200,
        data: result
      });
    } catch (err: any) {
      const errorResponse = handleK8sError(err);
      return jsonRes(res, errorResponse);
    }
  } else if (req.method === 'DELETE') {
    try {
      await deleteDatabase(k8s, {
        params: pathParamsParseResult.data
      });

      return jsonRes(res, {
        code: 200,
        message: 'Database deleted successfully',
        data: `Successfully deleted database: ${pathParamsParseResult.data.databaseName}`
      });
    } catch (err: any) {
      const errorResponse = handleK8sError(err);
      return jsonRes(res, errorResponse);
    }
  } else {
    return jsonRes(res, {
      code: 405,
      message: 'Method not allowed'
    });
  }
}
