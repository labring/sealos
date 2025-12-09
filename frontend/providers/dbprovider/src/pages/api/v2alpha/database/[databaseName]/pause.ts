import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes, handleK8sError } from '@/services/backend/response';
import { pauseDatabaseSchemas } from '@/types/apis/v2alpha';
import { ResponseCode, ResponseMessages } from '@/types/response';
import { NextApiRequest, NextApiResponse } from 'next';
import { pauseDatabase } from '@/services/backend/v2alpha/pause-database';

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
      const pathParamsParseResult = pauseDatabaseSchemas.pathParams.safeParse(req.query);
      if (!pathParamsParseResult.success) {
        return res.status(400).json({
          error: 'Invalid request params.',
          details: pathParamsParseResult.error.issues
        });
      }

      await pauseDatabase(
        k8s,
        {
          params: pathParamsParseResult.data
        },
        req
      );

      return res.status(204).end();
    } catch (error) {
      return jsonRes(res, handleK8sError(error));
    }
  }

  return res.status(405).json({
    error: 'Method not allowed'
  });
}
