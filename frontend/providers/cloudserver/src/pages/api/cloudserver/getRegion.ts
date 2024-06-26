import { verifyAccessToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { POST } from '@/services/requestLaf';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await verifyAccessToken(req);

    const { data, error } = await POST(
      '/action/get-region-details',
      {},
      {
        headers: {
          Authorization: req.headers.authorization
        }
      }
    );

    if (error) {
      return jsonRes(res, { code: 500, error: error });
    }

    jsonRes(res, {
      data: data
    });
  } catch (error) {
    jsonRes(res, { code: 500, error: error });
  }
}
