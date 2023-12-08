import { CRDMeta, K8sApi, ListCRD } from '@/services/backend/kubernetes/user';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserKubeconfig } from '@/services/backend/kubernetes/admin';
import { verifyAccessToken } from '@/services/backend/auth';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await verifyAccessToken(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'failed to get info' });
    const nsid = payload.workspaceId;
    const kc = await getUserKubeconfig(payload.userCrUid, payload.userCrName);
    if (!kc) return jsonRes(res, { code: 404, message: 'The kubeconfig is not found' });
    const notification_meta: CRDMeta = {
      group: 'notification.sealos.io',
      version: 'v1',
      namespace: nsid,
      plural: 'notifications'
    };

    const listCrd = await ListCRD(K8sApi(kc), notification_meta);
    jsonRes(res, { data: listCrd.body });
  } catch (err) {
    console.log(err);
    jsonRes(res, { code: 500 });
  }
}
