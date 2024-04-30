import { verifyAccessToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { getRegionById } from '@/services/db/region';
import { getUserById } from '@/services/db/user';
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

    const { userId } = req.query as {
      userId: string;
    };

    const user = await getUserById(payload.userId);

    if (!user?.isAdmin) {
      return jsonRes(res, {
        code: 401,
        message: 'unauthorized'
      });
    }

    const userInfo = await getUserById(userId);
    const regionInfo = await getRegionById(userInfo?.regionUid || '');

    jsonRes(res, {
      data: {
        user: userInfo,
        regionInfo: regionInfo
      }
    });
  } catch (error) {
    jsonRes(res, { code: 500, data: error });
  }
}
