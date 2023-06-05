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
    const kc = await authSession(req.headers);

    // get user account payment amount
    const user = kc.getCurrentUser();
    if (user === null) {
      return jsonRes(res, { code: 401, message: 'user null' });
    }

    const account_meta: CRDMeta = {
      group: 'account.sealos.io',
      version: 'v1',
      namespace: 'sealos-system',
      plural: 'accounts'
    };

    const accountDesc = await GetCRD(kc, account_meta, user.name);
    if (accountDesc !== null && accountDesc.body !== null && accountDesc.body.status !== null) {
      const accountStatus = accountDesc.body.status as accountStatus;
      return jsonRes(res, { data: accountStatus });
    }
  } catch (error) {
    jsonRes(res, { code: 500, data: error });
  }
}
