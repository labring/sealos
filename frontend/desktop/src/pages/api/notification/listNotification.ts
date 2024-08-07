import { CRDMeta, K8sApi, ListCRD } from '@/services/backend/kubernetes/user';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAccessToken } from '@/services/backend/auth';
import { getUserKubeconfigNotPatch } from '@/services/backend/kubernetes/admin';
import { switchKubeconfigNamespace } from '@/utils/switchKubeconfigNamespace';
import { NotificationCR } from '@/types';
import { adaptNotification } from '@/utils/adapt';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await verifyAccessToken(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'failed to get info' });
    const namespace = payload.workspaceId;
    const _kc = await getUserKubeconfigNotPatch(payload.userCrName);
    if (!_kc) return jsonRes(res, { code: 404, message: 'user is not found' });
    const realKc = switchKubeconfigNamespace(_kc, namespace);
    const kc = K8sApi(realKc);
    if (!kc) return jsonRes(res, { code: 404, message: 'The kubeconfig is not found' });
    const notification_meta: CRDMeta = {
      group: 'notification.sealos.io',
      version: 'v1',
      namespace,
      plural: 'notifications'
    };

    const result = (await ListCRD(kc, notification_meta)) as {
      body: {
        items: NotificationCR[];
      };
    };
    const data = result.body?.items?.map(adaptNotification);

    jsonRes(res, { data: data });
  } catch (err: any) {
    console.log(err);
    jsonRes(res, { code: 500, data: err?.body });
  }
}
