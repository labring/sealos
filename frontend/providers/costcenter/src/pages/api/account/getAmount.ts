import { authSession } from '@/service/backend/auth';
import { jsonRes } from '@/service/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const base = global.AppConfig.costCenter.components.accountService.url as string;
    if (!base) throw Error("can't ot get alapha1");
    const kc = await authSession(req.headers);

    // get user account payment amount
    const user = kc.getCurrentUser();
    if (user === null) {
      return jsonRes(res, { code: 401, message: 'user null' });
    }
    const body = JSON.stringify({
      kubeConfig: kc.exportConfig(),
      owner: user.name
    });
    const response = await fetch(base + '/account/v1alpha1/account', {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = (await response.clone().json()) as {
      account?: {
        UserUID: string;
        ActivityBonus: number;
        EncryptBalance: string;
        EncryptDeductionBalance: string;
        CreatedAt: Date;
        Balance: number;
        DeductionBalance: number;
      };
    };
    if (!kc || !data?.account) return jsonRes(res, { code: 404, message: 'user is not found' });
    return jsonRes<{ balance: number; deductionBalance: number }>(res, {
      data: {
        balance: data.account.Balance,
        deductionBalance: data.account.DeductionBalance
      }
    });
  } catch (error) {
    console.log(error);
    jsonRes(res, { code: 500, message: 'get amount error' });
  }
}
