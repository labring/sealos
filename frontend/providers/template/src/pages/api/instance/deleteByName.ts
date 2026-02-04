import type { NextApiRequest, NextApiResponse } from 'next';

import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ResponseCode } from '@/types/response';
import {
  deleteInstanceOnly,
  getInstanceOrThrow404,
  isInstanceOwnerReferencesReady,
  legacyDeleteInstanceAll
} from '@/services/backend/instanceDelete';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { instanceName } = req.query as { instanceName: string };
    const k8s = await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    // Instance (read first, decide strategy)
    let instance;
    try {
      instance = await getInstanceOrThrow404(k8s.k8sCustomObjects, k8s.namespace, instanceName);
    } catch (error: any) {
      if (+error?.body?.code === 404) {
        return jsonRes(res, {
          code: ResponseCode.NOT_FOUND,
          message: 'Instance not found in namespace'
        });
      }
      throw error;
    }

    // New instances: only delete Instance, rely on GC cascade
    if (isInstanceOwnerReferencesReady(instance)) {
      await deleteInstanceOnly(k8s.k8sCustomObjects, k8s.namespace, instance.metadata.name);
      return jsonRes(res, { message: `Instance "${instanceName}" deleted successfully` });
    }

    // Legacy instances: comprehensive cleanup then delete Instance
    await legacyDeleteInstanceAll(k8s, instanceName);
    await deleteInstanceOnly(k8s.k8sCustomObjects, k8s.namespace, instance.metadata.name);

    return jsonRes(res, { message: `Instance "${instanceName}" deleted successfully` });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}
