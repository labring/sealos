import { verifyAccessToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { getUserById } from '@/services/db/user';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { userId: adminId } = await verifyAccessToken(req);
    const { userId } = req.query as {
      userId: string;
    };

    const admin = await getUserById(adminId);
    if (!admin?.isAdmin) {
      return jsonRes(res, {
        code: 401,
        message: 'unauthorized'
      });
    }

    const reuslt = await getUserById(userId);

    return jsonRes(res, {
      data: reuslt
    });
  } catch (error) {
    jsonRes(res, { code: 500, data: error });
  }
}
