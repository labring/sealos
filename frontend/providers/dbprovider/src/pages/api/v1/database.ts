import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import { NextApiRequest, NextApiResponse } from 'next';
import { createDatabaseSchemas } from '@/types/apis';
import { ResponseCode, ResponseMessages } from '@/types/response';
import { createDatabase } from '@/services/backend/apis/create-database';

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

  if (req.method === 'POST') {
    try {
      console.log('Received create database request:', req.body);

      // 验证请求体
      const bodyParseResult = createDatabaseSchemas.body.safeParse(req.body);
      if (!bodyParseResult.success) {
        console.error('Request body validation failed:', bodyParseResult.error.issues);
        return jsonRes(res, {
          code: 400,
          message: 'Invalid request body.',
          error: bodyParseResult.error.issues
        });
      }

      console.log('Request body validation passed, creating database...');
      console.log('Validated data:', {
        name: bodyParseResult.data.name,
        type: bodyParseResult.data.type,
        version: bodyParseResult.data.version,
        resources: bodyParseResult.data.resource,
        terminationPolicy: bodyParseResult.data.terminationPolicy
      });

      // 创建数据库
      const result = await createDatabase(k8s, {
        body: bodyParseResult.data
      });

      console.log('Database creation completed successfully');

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
      console.error('Error creating database:', {
        message: err.message,
        stack: err.stack,
        body: req.body,
        error: err
      });

      // 增强错误处理
      let errorResponse;

      // 检查是否是K8s相关错误
      if (err.response || err.body) {
        errorResponse = handleK8sError(err);
      } else {
        // 处理其他类型的错误
        errorResponse = {
          code: 500,
          message: err.message || 'Internal server error',
          error: process.env.NODE_ENV === 'development' ? err.stack : undefined
        };
      }

      console.log('Returning error response:', errorResponse);

      return jsonRes(res, errorResponse);
    }
  }

  if (req.method === 'GET') {
    // 添加GET方法支持，用于获取数据库列表或状态
    try {
      const { dbName } = req.query;

      if (dbName) {
        // 获取特定数据库信息
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
        // 获取所有数据库列表
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
      console.error('Error getting database info:', err);
      const errorResponse = handleK8sError(err);
      return jsonRes(res, errorResponse);
    }
  }

  console.log(`Method ${req.method} not allowed`);
  return jsonRes(res, {
    code: 405,
    message: 'Method not allowed'
  });
}
