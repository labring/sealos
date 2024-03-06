import { GetCRD, K8sApi } from '@/services/backend/kubernetes/user';
import { jsonRes } from '@/services/backend/response';
import { CRDMeta } from '@/types';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserKubeconfigNotPatch, K8sApiDefault } from '@/services/backend/kubernetes/admin';
import { verifyAccessToken } from '@/services/backend/auth';
export const AccountMeta: CRDMeta = {
  group: 'account.sealos.io',
  version: 'v1',
  namespace: 'sealos-system',
  plural: 'accounts'
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await verifyAccessToken(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token is invaild' });
    const kc = await getUserKubeconfigNotPatch(payload.userCrName);
    if (!kc) return jsonRes(res, { code: 404, message: ' kubeconfig is not found' });
    const result = await GetCRD(K8sApiDefault(), AccountMeta, payload.userCrName);
    jsonRes(res, { data: result?.body });
  } catch (error) {
    console.log(error);
    jsonRes(res, { code: 500, data: error });
  }
}
