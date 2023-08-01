import { authSession } from '@/service/backend/auth';
import { CRDMeta, GetCRD } from '@/service/backend/kubernetes';
import { jsonRes } from '@/service/backend/response';
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

    const accountDesc = (await GetCRD(kc, account_meta, user.name)) as {
      body: {
        status: object;
      };
    };
    if (accountDesc !== null && accountDesc.body !== null && accountDesc.body.status !== null) {
      const accountStatus = accountDesc.body.status as accountStatus;
      return jsonRes(res, { data: accountStatus });
    } else {
      throw new Error('account Desc is null');
    }
  } catch (error) {
    console.log(error);
    jsonRes(res, { code: 500, message: 'get amount error' });
  }
}
