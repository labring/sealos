import { verifyAccessToken } from '@/services/backend/auth';
import { globalPrisma } from '@/services/backend/db/init';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await verifyAccessToken(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token is invaild' });
    const status = await globalPrisma.credits.findFirst({
      where: {
        user_uid: payload.userUid,
        status: 'active'
      }
    });
    if (!status) return jsonRes(res, { code: 404, message: 'user is not found' });
    return jsonRes<{ amount: number; usedAmount: number }>(res, {
      data: {
        amount: Number(status.amount || 0),
        usedAmount: Number(status.used_amount || 0)
      }
    });
  } catch (error) {
    console.log(error);
    jsonRes(res, { code: 500, data: 'get credit error' });
  }
}
