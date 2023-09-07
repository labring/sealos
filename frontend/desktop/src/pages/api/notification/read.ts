import { authSession } from '@/services/backend/auth';
import { CRDMeta, UpdateCRD } from '@/services/backend/kubernetes/user';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { name } = req.body;
    const payload = await authSession(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'error' });

    const meta: CRDMeta = {
      group: 'notification.sealos.io',
      version: 'v1',
      namespace: payload.user.nsid,
      plural: 'notifications'
    };

    // crd patch
    const patch = [
      {
        op: 'add',
        path: '/metadata/labels',
        value: {
          isRead: 'true'
        }
      }
    ];
    // const patch = [{ op: 'remove', path: '/metadata/labels/isRead' }]; // dev

    let result = [];
    for (const n of name) {
      let temp = await UpdateCRD(payload.kc, meta, n, patch);
      result.push(temp?.body);
    }
    jsonRes(res, { data: result });
  } catch (err) {
    jsonRes(res, { code: 500, data: err });
  }
}
