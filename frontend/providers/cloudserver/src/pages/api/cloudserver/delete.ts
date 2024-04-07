import { verifyAccessToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import getCloudProvider from '@/services/cloudProvider';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await verifyAccessToken(req);
    const { instanceName, handle } = req.body;
    const cloudProvider = getCloudProvider();

    return jsonRes(res, {
      data: 'success'
    });
  } catch (error) {
    console.log(error);
    jsonRes(res, { code: 500, error: error });
  }
}
