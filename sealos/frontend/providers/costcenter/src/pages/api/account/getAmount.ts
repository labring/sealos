import { makeAPIClientByHeader } from '@/service/backend/region';
import { jsonRes } from '@/service/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const client = await makeAPIClientByHeader(req, res);
    if (!client) return;
    const response = await client.post('/account/v1alpha1/account', {});

    const data = response.data as {
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
    if (!data?.account) return jsonRes(res, { code: 404, message: 'user is not found' });
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
