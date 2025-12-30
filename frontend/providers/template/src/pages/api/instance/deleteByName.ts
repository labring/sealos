import type { NextApiRequest, NextApiResponse } from 'next';

import { authSession } from '@/services/backend/auth';
import { CRDMeta, getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { withErrorHandler } from '@/services/backend/middleware';

export default withErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { instanceName } = req.query as { instanceName: string };
  const { k8sCustomObjects, namespace } = await getK8s({
    kubeconfig: await authSession(req.headers)
  });

  const InstanceCRD: CRDMeta = {
    group: 'app.sealos.io',
    version: 'v1',
    namespace: namespace,
    plural: 'instances'
  };

  await k8sCustomObjects.deleteNamespacedCustomObject(
    InstanceCRD.group,
    InstanceCRD.version,
    InstanceCRD.namespace,
    InstanceCRD.plural,
    instanceName
  );

  jsonRes(res, { message: `Custom object "${instanceName}" deleted successfully` });
});
