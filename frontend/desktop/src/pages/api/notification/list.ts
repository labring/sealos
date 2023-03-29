import type { NextApiRequest, NextApiResponse } from 'next';
import { authSession } from 'services/backend/auth';
import { CRDMeta, GetUserDefaultNameSpace, K8sApi, ListCRD } from 'services/backend/kubernetes';
import { JsonResp } from '../response';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const kubeconfig = await authSession(req.headers);
  const kc = K8sApi(kubeconfig);
  const kube_user = kc.getCurrentUser();

  if (kube_user === null) {
    return res.status(400);
  }

  const notification_meta: CRDMeta = {
    group: 'notification.sealos.io',
    version: 'v1',
    namespace: GetUserDefaultNameSpace(kube_user.name),
    plural: 'notifications'
  };

  try {
    const listCrd = await ListCRD(kc, notification_meta);
    JsonResp(listCrd.body, res);
  } catch (err) {
    // console.log(err);
    JsonResp(err, res);
  }
}
