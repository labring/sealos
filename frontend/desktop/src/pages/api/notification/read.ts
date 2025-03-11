import { verifyAccessToken } from '@/services/backend/auth';
import { CRDMeta, K8sApi, UpdateCRD } from '@/services/backend/kubernetes/user';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserKubeconfigNotPatch } from '@/services/backend/kubernetes/admin';
import { switchKubeconfigNamespace } from '@/utils/switchKubeconfigNamespace';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { name } = req.body;
    const payload = await verifyAccessToken(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'failed to get info' });

    const namespace = payload.workspaceId;
    const _kc = await getUserKubeconfigNotPatch(payload.userCrName);
    if (!_kc) return jsonRes(res, { code: 404, message: 'user is not found' });

    const kc = K8sApi(switchKubeconfigNamespace(_kc, namespace));
    const meta: CRDMeta = {
      group: 'notification.sealos.io',
      version: 'v1',
      namespace,
      plural: 'notifications'
    };

    const patch = [
      {
        op: 'add',
        path: '/metadata/labels',
        value: { isRead: 'true' }
      }
    ];
    // const patch = [{ op: 'remove', path: '/metadata/labels/isRead' }]; // dev
    const results = [];

    for (const n of name) {
      try {
        const temp = await UpdateCRD(kc, meta, n, patch);
        results.push(temp?.body);
      } catch (err: any) {
        if (err?.body?.code === 403) {
          return jsonRes(res, {
            data: {
              name: n,
              reason: err?.body?.reason,
              message: err?.body?.message,
              code: 403
            }
          });
        }
        return jsonRes(res, {
          code: 500,
          data: {
            name: n,
            message: err?.message || 'Unknown error'
          }
        });
      }
    }

    return jsonRes(res, { data: results });
  } catch (err) {
    return jsonRes(res, { code: 500, data: err });
  }
}
