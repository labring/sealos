import { verifyAccessToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { POST } from '@/services/requestLaf';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await verifyAccessToken(req);

    const { data, error } = await POST(
      '/action/get-virtual-machine-package',
      {},
      {
        headers: {
          Authorization: req.headers.authorization
        }
      }
    );

    return jsonRes(res, {
      data: data || error
    });
  } catch (error) {
    jsonRes(res, { code: 500, error: error });
  }
}
