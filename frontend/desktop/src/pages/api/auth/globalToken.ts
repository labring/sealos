import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { generateGlobalAccessToken, verifyAccessToken } from '@/services/backend/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const regionUserData = await verifyAccessToken(req.headers);

    if (!regionUserData)
      return jsonRes(res, {
        code: 401,
        message: 'invalid token'
      });
    return jsonRes(res, {
      code: 200,
      message: 'Successfully',
      data: {
        token: generateGlobalAccessToken({
          sub: regionUserData.userUid,
          user_id: regionUserData.userId
        })
      }
    });
  } catch (err) {
    console.log(err);
    return jsonRes(res, {
      message: 'Failed to get globalToken',
      code: 500
    });
  }
}
