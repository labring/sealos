import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { ResponseCode, ResponseMessages } from '@/types/response';
import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { deleteInstanceSchemas } from '@/types/apis';
import {
  deleteInstanceOnly,
  getInstanceOrThrow404,
  isInstanceOwnerReferencesReady,
  legacyDeleteInstanceAll
} from '@/services/backend/instanceDelete';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Parse parameters
  const params = deleteInstanceSchemas.pathParams.safeParse(req.query);
  if (!params.success) {
    return jsonRes(res, {
      code: 400,
      message: 'Invalid request parameters',
      error: params.error
    });
  }
  const instanceName = params.data.instanceName;

  const kubeConfig = await authSession(req.headers).catch(() => null);
  if (!kubeConfig) {
    return jsonRes(res, {
      code: ResponseCode.UNAUTHORIZED,
      message: ResponseMessages[ResponseCode.UNAUTHORIZED]
    });
  }

  const k8s = await getK8s({
    kubeconfig: kubeConfig
  }).catch(() => null);

  if (!k8s) {
    return jsonRes(res, {
      code: ResponseCode.UNAUTHORIZED,
      message: ResponseMessages[ResponseCode.UNAUTHORIZED]
    });
  }

  if (req.method === 'DELETE') {
    try {
      // Instance (read first, decide strategy)
      let instance;
      try {
        instance = await getInstanceOrThrow404(k8s.k8sCustomObjects, k8s.namespace, instanceName);
      } catch (error: any) {
        if (error?.body?.code !== 404) {
          throw error?.body || error;
        }

        return jsonRes(res, {
          code: ResponseCode.NOT_FOUND,
          message: ResponseMessages[ResponseCode.NOT_FOUND]
        });
      }

      // New instances: only delete Instance, rely on GC cascade
      if (isInstanceOwnerReferencesReady(instance)) {
        await deleteInstanceOnly(k8s.k8sCustomObjects, k8s.namespace, instance.metadata.name);
        return jsonRes(res, {
          code: ResponseCode.SUCCESS,
          message: ResponseMessages[ResponseCode.SUCCESS]
        });
      }

      // Legacy instances: comprehensive cleanup then delete Instance
      await legacyDeleteInstanceAll(k8s, instanceName);
      await deleteInstanceOnly(k8s.k8sCustomObjects, k8s.namespace, instance.metadata.name);

      return jsonRes(res, {
        code: ResponseCode.SUCCESS,
        message: ResponseMessages[ResponseCode.SUCCESS]
      });
    } catch (error) {
      return jsonRes(res, {
        code: ResponseCode.SERVER_ERROR,
        message: ResponseMessages[ResponseCode.SERVER_ERROR],
        error
      });
    }
  }

  return jsonRes(res, {
    code: 405,
    message: 'Method not allowed'
  });
}
