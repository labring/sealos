import { verifyAccessToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { getRegionById } from '@/services/db/region';
import { getOrderByOrderIdAndUserId } from '@/services/db/workorder';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await verifyAccessToken(req);
    if (!payload) {
      return jsonRes(res, {
        code: 401,
        message: "'token is invaild'"
      });
    }
    const { orderId } = req.query as {
      orderId: string;
    };

    if (!payload.isAdmin) {
      return jsonRes(res, {
        code: 401,
        message: 'unauthorized'
      });
    }

    const result = await getOrderByOrderIdAndUserId({
      orderId,
      userId: payload.userId
    });
    const regionInfo = await getRegionById(result?.userInfo?.regionUid || '');

    jsonRes(res, {
      data: {
        user: result?.userInfo,
        regionInfo: regionInfo,
        workorderLink: `https://hzh.sealos.run/?openapp=system-workorder?orderId=${orderId}`
      }
    });
  } catch (error) {
    jsonRes(res, { code: 500, data: error });
  }
}
