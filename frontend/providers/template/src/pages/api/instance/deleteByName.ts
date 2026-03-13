import type { NextApiRequest, NextApiResponse } from 'next';

import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { withErrorHandler } from '@/services/backend/middleware';
import {
  deleteInstanceOnly,
  getInstanceOrThrow404,
  isInstanceOwnerReferencesReady,
  legacyDeleteInstanceAll
} from '@/services/backend/instanceDelete';

export default withErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { instanceName } = req.query as { instanceName: string };
  const k8s = await getK8s({
    kubeconfig: await authSession(req.headers)
  });

  let instance;
  try {
    instance = await getInstanceOrThrow404(k8s.k8sCustomObjects, k8s.namespace, instanceName);
  } catch (error: any) {
    if (error?.body?.code === 404) {
      return jsonRes(res, { code: 404, message: 'Instance not found in namespace' });
    }
    throw error;
  }

  if (isInstanceOwnerReferencesReady(instance)) {
    await deleteInstanceOnly(k8s.k8sCustomObjects, k8s.namespace, instance.metadata.name);
    return jsonRes(res, { message: `Instance "${instanceName}" deleted successfully` });
  }

  await legacyDeleteInstanceAll(k8s, instanceName);
  await deleteInstanceOnly(k8s.k8sCustomObjects, k8s.namespace, instance.metadata.name);

  return jsonRes(res, { message: `Instance "${instanceName}" deleted successfully` });
});
