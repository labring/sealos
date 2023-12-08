import { verifyAccessToken } from '@/services/backend/auth';
import { CRDMeta, K8sApi, UpdateCRD } from '@/services/backend/kubernetes/user';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserKubeconfig } from '@/services/backend/kubernetes/admin';
import * as k8s from '@kubernetes/client-node';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { name } = req.body;
    const payload = await verifyAccessToken(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'failed to get info' });
    const kc = await getUserKubeconfig(payload.userCrUid, payload.userCrName);
    if (!kc) return jsonRes(res, { code: 404, message: 'The kubeconfig is not found' });
    const meta: CRDMeta = {
      group: 'notification.sealos.io',
      version: 'v1',
      namespace: payload.workspaceId,
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
      let temp = await UpdateCRD(K8sApi(kc), meta, n, patch);
      result.push(temp?.body);
    }
    jsonRes(res, { data: result });
  } catch (err) {
    jsonRes(res, { code: 500, data: err });
  }
}
