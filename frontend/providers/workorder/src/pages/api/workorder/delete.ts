import { verifyAccessToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { deleteOrder } from '@/services/db/workorder';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { userId } = await verifyAccessToken(req);

    const { orderId } = req.query as {
      orderId: string;
    };

    const result = await deleteOrder({
      orderId: orderId,
      userId: userId
    });

    return jsonRes(res, {
      data: result
    });
  } catch (error) {
    jsonRes(res, { code: 500, data: error });
  }
}
