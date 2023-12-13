import { authSession } from '@/services/backend/auth';
import { GetCRD } from '@/services/backend/kubernetes/user';
import { jsonRes } from '@/services/backend/response';
import { CRDMeta } from '@/types';
import type { NextApiRequest, NextApiResponse } from 'next';

export const AccountMeta: CRDMeta = {
  group: 'account.sealos.io',
  version: 'v1',
  namespace: 'sealos-system',
  plural: 'accounts'
};

// req header is kubeconfig
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await authSession(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token is vaild' });

    const result = await GetCRD(payload.kc, AccountMeta, payload.user.k8s_username);
    jsonRes(res, { data: result?.body });
  } catch (error) {
    console.log(error);
    jsonRes(res, { code: 500, data: error });
  }
}
