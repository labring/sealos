import { verifyAccessToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import getCloudProvider from '@/services/cloudProvider';
import { POST } from '@/services/requestLaf';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { userId } = await verifyAccessToken(req);
    const cloudProvider = getCloudProvider();

    const { data } = await POST(
      '/action/get-virtual-machine-type',
      {
        cloudProvider
      },
      {
        headers: {
          Authorization: req.headers.authorization
        }
      }
    );

    return jsonRes(res, {
      data: data
    });
  } catch (error) {
    jsonRes(res, { code: 500, error: error });
  }
}
