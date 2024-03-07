import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { getRegionToken } from '@/services/backend/regionAuth';
import { verifyAuthenticationToken } from '@/services/backend/auth';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const realUser = await verifyAuthenticationToken(req.headers);

    if (!realUser)
      return jsonRes(res, {
        code: 401,
        message: 'invalid token'
      });
    const regionData = await getRegionToken(realUser);
    return jsonRes(res, {
      code: 200,
      message: 'Successfully',
      data: regionData
    });
  } catch (err) {
    console.log(err);
    return jsonRes(res, {
      message: 'Failed to authenticate with globalToken',
      code: 500
    });
  }
}
