import { verifyAccessToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { getOrderByOrderIdAndUserId } from '@/services/db/workorder';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { userId } = await verifyAccessToken(req);

    const { orderId } = req.query as {
      orderId: string;
    };

    const result = await getOrderByOrderIdAndUserId({
      orderId,
      userId: userId
    });

    if (!result) {
      return jsonRes(res, {
        code: 404,
        message: 'Not Found'
      });
    }
    return jsonRes(res, {
      data: result
    });
  } catch (error) {
    jsonRes(res, { code: 500, data: error });
  }
}
