import { verifyAccessToken } from '@/services/backend/auth';
import { globalPrisma } from '@/services/backend/db/init';
import { jsonRes } from '@/services/backend/response';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = req.query.token as string;
    const headers = token ? { authorization: token } : req.headers;

    const payload = await verifyAccessToken(headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'Unauthorized' });

    if (req.method !== 'POST') {
      return jsonRes(res, { code: 405, message: 'Method not allowed' });
    }

    await globalPrisma.user.update({
      where: { uid: payload.userUid },
      data: { lastActivityTime: new Date() }
    });

    return jsonRes(res, { code: 200, data: 'success' });
  } catch (error) {
    console.error('Update activity error:', error);
    return jsonRes(res, { code: 500, message: 'Internal server error' });
  }
}
