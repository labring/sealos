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
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  const kubeconfig = await authSession(req).catch(() => null);
  if (!kubeconfig) {
    console.log('Authentication failed - no kubeconfig');
    return jsonRes(res, {
      code: ResponseCode.UNAUTHORIZED,
      message: ResponseMessages[ResponseCode.UNAUTHORIZED]
    });
  }

  const k8s = await getK8s({ kubeconfig }).catch((error) => {
    console.error('Failed to get K8s client:', error);
    return null;
  });

  if (!k8s) {
    console.log('Failed to initialize K8s client');
    return jsonRes(res, {
      code: ResponseCode.UNAUTHORIZED,
      message: ResponseMessages[ResponseCode.UNAUTHORIZED]
    });
  }

  const pathParamsParseResult = getDatabaseSchemas.pathParams.safeParse(req.query);
  if (!pathParamsParseResult.success) {
    console.error('Path params validation failed:', pathParamsParseResult.error.issues);
    return jsonRes(res, {
      code: ResponseCode.BAD_REQUEST,
      message: ResponseMessages[ResponseCode.BAD_REQUEST],
      error: pathParamsParseResult.error.issues
    });
  }

  if (req.method === 'PATCH') {
    try {
      console.log('Received update database request:', {
        databaseName: pathParamsParseResult.data.databaseName,
        body: req.body
      });

      const bodyParseResult = updateDatabaseSchemas.body.safeParse(req.body);
      if (!bodyParseResult.success) {
        console.error('Request body validation failed:', bodyParseResult.error.issues);
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

      console.log('Request body validation passed, updating database...');
      console.log('Validated data:', {
        databaseName: pathParamsParseResult.data.databaseName,
        resource: bodyParseResult.data.resource
      });

      // 调用更新数据库函数
      const result = await updateDatabase(k8s, {
        params: pathParamsParseResult.data,
        body: bodyParseResult.data
      });

      console.log('Database update completed successfully');
      return jsonRes(res, result);
    } catch (err: any) {
      console.error('Error updating database:', {
        message: err.message,
        stack: err.stack,
        databaseName: pathParamsParseResult.data.databaseName,
        body: req.body
      });

      const errorResponse = handleK8sError(err);
      console.log('Returning error response:', errorResponse);

      return jsonRes(res, errorResponse);
    }
  } else if (req.method === 'GET') {
    try {
      console.log('Getting database:', pathParamsParseResult.data.databaseName);

      const result = await getDatabase(k8s, {
        params: pathParamsParseResult.data
      });

      return jsonRes(res, {
        code: 200,
        data: result
      });
    } catch (err: any) {
      console.error('Error getting database:', err);
      const errorResponse = handleK8sError(err);
      return jsonRes(res, errorResponse);
    }
  } else if (req.method === 'DELETE') {
    try {
      console.log('Deleting database:', pathParamsParseResult.data.databaseName);

      await deleteDatabase(k8s, {
        params: pathParamsParseResult.data
      });

      return jsonRes(res, {
        code: 200,
        message: 'Database deleted successfully',
        data: `Successfully deleted database: ${pathParamsParseResult.data.databaseName}`
      });
    } catch (err: any) {
      console.error('Error deleting database:', err);
      const errorResponse = handleK8sError(err);
      return jsonRes(res, errorResponse);
    }
  } else {
    console.log(`Method ${req.method} not allowed`);
    return jsonRes(res, {
      code: 405,
      message: 'Method not allowed'
    });
  }
}
