import { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@/services/backend/response';
import { globalPrisma } from '@/services/backend/db/init';
import { verifyAccessToken } from '@/services/backend/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const regionUser = await verifyAccessToken(req.headers);
    if (!regionUser)
      return jsonRes(res, {
        code: 401,
        message: 'invalid token'
      });

    const regionList = await globalPrisma.region.findMany();
    return jsonRes(res, {
      code: 200,
      message: 'Successfully',
      data: {
        regionList: regionList.map((region) => ({
          ...region,
          description: region.description ? JSON.parse(region.description) : null
        }))
      }
    });
  } catch (err) {
    console.log(err);
    return jsonRes(res, {
      message: 'Failed to get region list',
      code: 500
    });
  }
}
