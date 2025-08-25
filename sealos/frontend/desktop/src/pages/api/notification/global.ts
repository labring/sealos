import { verifyAccessToken } from '@/services/backend/auth';
import { K8sApiDefault } from '@/services/backend/kubernetes/admin';
import { CRDMeta, ListCRD } from '@/services/backend/kubernetes/user';
import { jsonRes } from '@/services/backend/response';
import { NotificationCR, TNotification } from '@/types';
import { adaptNotification } from '@/utils/adapt';
import type { NextApiRequest, NextApiResponse } from 'next';

const compareByTimestamp = (a: TNotification, b: TNotification) => b?.timestamp - a?.timestamp;

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
        items: NotificationCR[];
      };
    };

    const listData = listCrd.body?.items?.map(adaptNotification) || [];

    if (listData.length > 0) {
      listData.sort(compareByTimestamp);
      return jsonRes(res, { data: listData[0] });
    }

    jsonRes(res, { data: null });
  } catch (err: any) {
    jsonRes(res, { code: 500, data: err?.body });
  }
}
