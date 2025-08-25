import { verifyAccessToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { POST } from '@/services/requestLaf';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await verifyAccessToken(req);

    const { data } = await POST(
      '/action/get-image-list',
      {},
      {
        headers: {
          Authorization: req.headers.authorization
        }
      }
    );

    jsonRes(res, {
      data: data
    });
  } catch (error) {
    jsonRes(res, { code: 500, error: error });
  }
}
