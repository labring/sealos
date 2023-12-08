import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserKubeconfig } from '@/services/backend/kubernetes/admin';
import process from 'process';
import { verifyAccessToken } from '@/services/backend/auth';

type accountStatus = {
  balance: number;
  deductionBalance: number;
};
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const base = process.env['BILLING_URI'];
    if (!base) throw Error("can't ot get alapha1");
    const payload = await verifyAccessToken(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token is invaild' });
    // get user account payment amount
    const kc = await getUserKubeconfig(payload.userCrUid, payload.userCrName);
    const body = JSON.stringify({
      kubeConfig: kc,
      owner: payload.userCrName
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
    jsonRes(res, { code: 500, data: 'get amount error' });
  }
}
