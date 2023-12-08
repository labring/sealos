import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { globalPrisma, prisma } from '@/services/backend/db/init';
import { verifyAccessToken } from '@/services/backend/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const regionUser = await verifyAccessToken(req.headers);
    if (!regionUser)
      return jsonRes(res, {
        code: 401,
        message: 'invalid token'
      });
    const [regionData, globalData] = await Promise.all([
      prisma.userCr.findUnique({
        where: {
          uid: regionUser.userCrUid
        }
      }),
      globalPrisma.user.findUnique({
        where: {
          uid: regionUser.userUid
        }
      })
    ]);
    if (!regionData || !globalData)
      return jsonRes(res, {
        code: 404,
        message: 'Not found'
      });
    else
      return jsonRes(res, {
        code: 200,
        message: 'Successfully',
        data: {
          info: globalData
        }
      });
  } catch (err) {
    console.log(err);
    return jsonRes(res, {
      message: 'Failed to get info',
      code: 500
    });
  }
}
