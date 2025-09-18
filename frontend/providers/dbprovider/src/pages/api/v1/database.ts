import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import { NextApiRequest, NextApiResponse } from 'next';
import { createDatabaseSchemas } from '@/types/apis';
import { ResponseCode, ResponseMessages } from '@/types/response';
import { createDatabase } from '@/services/backend/apis/create-database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const kubeconfig = await authSession(req).catch(() => null);
  if (!kubeconfig) {
    return jsonRes(res, {
      code: ResponseCode.UNAUTHORIZED,
      message: ResponseMessages[ResponseCode.UNAUTHORIZED]
    });
  }

  const k8s = await getK8s({ kubeconfig }).catch((error) => {
    return null;
  });

  if (!k8s) {
    return jsonRes(res, {
      code: ResponseCode.UNAUTHORIZED,
      message: ResponseMessages[ResponseCode.UNAUTHORIZED]
    });
  }

  if (req.method === 'POST') {
    try {
      const bodyParseResult = createDatabaseSchemas.body.safeParse(req.body);
      if (!bodyParseResult.success) {
        return jsonRes(res, {
          code: 400,
          message: 'Invalid request body.',
          error: bodyParseResult.error.issues
        });
      }

      // 创建数据库
      const result = await createDatabase(k8s, {
        body: bodyParseResult.data
      });

      // 增强返回数据，确保包含必要的连接信息
      const responseData = {
        ...result,
        message: 'Database created successfully',
        // 确保返回的数据包含状态信息
        status: result.status || 'Creating',
        // 添加创建时间戳
        createdAt: new Date().toISOString()
      };

      return jsonRes(res, {
        code: 200,
        message: 'success create db',
        data: responseData
      });
    } catch (err: any) {
      let errorResponse;

      if (err.response || err.body) {
        errorResponse = handleK8sError(err);
      } else {
        errorResponse = {
          code: 500,
          message: err.message || 'Internal server error',
          error: process.env.NODE_ENV === 'development' ? err.stack : undefined
        };
      }

      return jsonRes(res, errorResponse);
    }
  }

  if (req.method === 'GET') {
    try {
      const { dbName } = req.query;

      if (dbName) {
        const { body } = await k8s.k8sCustomObjects.getNamespacedCustomObject(
          'apps.kubeblocks.io',
          'v1alpha1',
          k8s.namespace,
          'clusters',
          dbName as string
        );

        return jsonRes(res, {
          code: 200,
          data: body
        });
      } else {
        const { body } = await k8s.k8sCustomObjects.listNamespacedCustomObject(
          'apps.kubeblocks.io',
          'v1alpha1',
          k8s.namespace,
          'clusters'
        );

        return jsonRes(res, {
          code: 200,
          data: body
        });
      }
    } catch (err: any) {
      const errorResponse = handleK8sError(err);
      return jsonRes(res, errorResponse);
    }
  }

  return jsonRes(res, {
    code: 405,
    message: 'Method not allowed'
  });
}
