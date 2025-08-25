import { verifyAccessToken } from '@/services/backend/auth';
import { globalPrisma } from '@/services/backend/db/init';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';

type accountStatus = {
  balance: number;
  deductionBalance: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await verifyAccessToken(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token is invaild' });
    const status = await globalPrisma.account.findUnique({
      where: {
        userUid: payload.userUid
      }
    });
    if (!status) return jsonRes(res, { code: 404, message: 'user is not found' });
    return jsonRes<{ balance: number; deductionBalance: number }>(res, {
      data: {
        balance: Number(status.balance || 0),
        deductionBalance: Number(status.deduction_balance || 0)
      }
    });
  } catch (error) {
    console.log(error);
    jsonRes(res, { code: 500, data: 'get amount error' });
  }
}
