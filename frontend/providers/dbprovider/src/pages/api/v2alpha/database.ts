import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import { NextApiRequest, NextApiResponse } from 'next';
import { createDatabaseSchemas } from '@/types/apis/v2alpha';
import { ResponseCode, ResponseMessages } from '@/types/response';
import { createDatabase } from '@/services/backend/v2alpha/create-database';
import { getDatabaseList } from '@/services/backend/v2alpha/list-database';

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
      await createDatabase(k8s, {
        body: bodyParseResult.data
      });

      return res.status(204).end();
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
      const errorResponse = handleK8sError(err);
      return jsonRes(res, errorResponse);
    }
  }

  return res.status(405).json({
    error: 'Method not allowed'
  });
}
