import { authSession } from '@/services/backend/auth';
import { CRDMeta, GetUserDefaultNameSpace, ListCRD } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const kc = await authSession(req.headers);
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

    const listCrd = await ListCRD(kc, notification_meta);
    jsonRes(res, { data: listCrd.body });
  } catch (err) {
    jsonRes(res, { code: 500, data: err });
  }
}
