import { authSession } from '@/services/backend/auth';
import { CRDMeta, ListCRD } from '@/services/backend/kubernetes/user';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await authSession(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'failed to get info' });
    const nsid = payload.user.nsid;
    const kc = payload.kc;

    const notification_meta: CRDMeta = {
      group: 'notification.sealos.io',
      version: 'v1',
      namespace: nsid,
      plural: 'notifications'
    };

    const listCrd = await ListCRD(kc, notification_meta);
    jsonRes(res, { data: listCrd.body });
  } catch (err) {
    jsonRes(res, { code: 500, data: err });
  }
}
