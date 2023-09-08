import { authSession } from '@/services/backend/auth';
import { CRDMeta, GetCRD } from '@/services/backend/kubernetes/user';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';

type accountStatus = {
  balance: number;
  deductionBalance: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await authSession(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token is vaild' });
    // get user account payment amount

    const account_meta: CRDMeta = {
      group: 'account.sealos.io',
      version: 'v1',
      namespace: 'sealos-system',
      plural: 'accounts'
    };
    const k8s_username = payload.user.k8s_username;
    const accountDesc = await GetCRD(payload.kc, account_meta, k8s_username);
    if (accountDesc !== null && accountDesc.body !== null && accountDesc.body.status !== null) {
      const accountStatus = accountDesc.body.status as accountStatus;
      return jsonRes(res, { data: accountStatus });
    }
  } catch (error) {
    jsonRes(res, { code: 500, data: error });
  }
}
