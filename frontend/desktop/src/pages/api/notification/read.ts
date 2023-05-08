import { authSession } from '@/services/backend/auth';
import { CRDMeta, GetUserDefaultNameSpace, UpdateCRD } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { name } = req.body;
    const kc = await authSession(req.headers);
    const kube_user = kc.getCurrentUser();
    if (kube_user === null) {
      return res.status(400);
    }

    const meta: CRDMeta = {
      group: 'notification.sealos.io',
      version: 'v1',
      namespace: GetUserDefaultNameSpace(kube_user.name),
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
      let temp = await UpdateCRD(kc, meta, n, patch);
      result.push(temp?.body);
    }
    jsonRes(res, { data: result });
  } catch (err) {
    jsonRes(res, { code: 500, data: err });
  }
}
