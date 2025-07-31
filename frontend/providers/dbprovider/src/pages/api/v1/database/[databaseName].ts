import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import { NextApiRequest, NextApiResponse } from 'next';
import { ResponseCode, ResponseMessages } from '@/types/response';
import { updateDatabaseSchemas } from '@/types/apis';
import { updateDatabase } from '@/services/backend/apis/update-database';

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

  if (req.method === 'PATCH') {
    try {
      const pathParamsParseResult = updateDatabaseSchemas.pathParams.safeParse(req.query);
      if (!pathParamsParseResult.success) {
        return jsonRes(res, {
          code: 400,
          message: 'Invalid request params.',
          error: pathParamsParseResult.error.issues
        });
      }

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

      return jsonRes(res, {
        data: `Successfully submitted ${result.opsRequests.length} change requests`
      });
    } catch (err) {
      console.log('error create db', err);
      jsonRes(res, handleK8sError(err));
    }
  }

  return jsonRes(res, {
    code: 405,
    message: 'Method not allowed'
  });
}
