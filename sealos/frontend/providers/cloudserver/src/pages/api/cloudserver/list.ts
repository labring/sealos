import { verifyAccessToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { POST } from '@/services/requestLaf';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await verifyAccessToken(req);
    const { page = 1, pageSize = 10 } = req.body as {
      page: number;
      pageSize: number;
    };

    const { data, error } = await POST(
      '/action/get-virtual-machine-detail-list',
      {
        page,
        pageSize
      },
      {
        headers: {
          Authorization: req.headers.authorization
        }
      }
    );

    return jsonRes(res, {
      data: data || error
    });
  } catch (error: any) {
    jsonRes(res, { code: 500, error: error });
  }
}
