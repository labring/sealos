import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes, handleK8sError } from '@/services/backend/response';
import { restartDatabaseSchemas } from '@/types/apis';
import { ResponseCode, ResponseMessages } from '@/types/response';
import { NextApiRequest, NextApiResponse } from 'next';
import { restartDatabase } from '@/services/backend/apis/restart-database';

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

  if (req.method === 'POST') {
    try {
      const pathParamsParseResult = restartDatabaseSchemas.pathParams.safeParse(req.query);
      if (!pathParamsParseResult.success) {
        return jsonRes(res, {
          code: 400,
          message: 'Invalid request params.',
          error: pathParamsParseResult.error.issues
        });
      }

      const result = await restartDatabase(
        k8s,
        {
          params: pathParamsParseResult.data
        },
        req
      );

      return jsonRes(res, result);
    } catch (error) {
      return jsonRes(res, handleK8sError(error));
    }
  }

  return jsonRes(res, {
    code: 405,
    message: 'Method not allowed'
  });
}
