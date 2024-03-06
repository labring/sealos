import { verifyAccessToken } from '@/services/backend/auth';
import { K8sApiDefault } from '@/services/backend/kubernetes/admin';
import { CRDMeta, ListCRD } from '@/services/backend/kubernetes/user';
import { jsonRes } from '@/services/backend/response';
import { NotificationItem } from '@/types';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await verifyAccessToken(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'failed to get info' });
    const defaultKc = K8sApiDefault();
    const notification_meta: CRDMeta = {
      group: 'notification.sealos.io',
      version: 'v1',
      namespace: 'sealos',
      plural: 'notifications'
    };

    const listCrd = (await ListCRD(defaultKc, notification_meta)) as {
      body: {
        items: NotificationItem[];
      };
    };

    const compareByTimestamp = (a: NotificationItem, b: NotificationItem) =>
      b?.spec?.timestamp - a?.spec?.timestamp;

    if (listCrd.body?.items) {
      listCrd.body.items.sort(compareByTimestamp);
      if (listCrd.body.items[0]) {
        return jsonRes(res, { data: listCrd.body.items[0] });
      }
    }

    jsonRes(res, { data: listCrd.body });
  } catch (err) {
    jsonRes(res, { code: 500, data: err });
  }
}
