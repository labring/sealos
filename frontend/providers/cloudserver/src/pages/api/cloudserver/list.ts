import { verifyAccessToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import getCloudProvider from '@/services/cloudProvider';
import { POST } from '@/services/requestLaf';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await verifyAccessToken(req);
    const { page = 1, pageSize = 10 } = req.body as {
      page: number;
      pageSize: number;
    };
    const cloudProvider = getCloudProvider();

    const { data } = await POST(
      '/action/get-virtual-machine-detail-list',
      {
        page,
        pageSize,
        cloudProvider: cloudProvider
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
  } catch (error: any) {
    jsonRes(res, { code: 500, error: error });
  }
}
