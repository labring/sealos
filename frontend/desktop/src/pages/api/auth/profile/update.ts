import { verifyAccessToken } from '@/services/backend/auth';
import { globalPrisma } from '@/services/backend/db/init';
import { jsonRes } from '@/services/backend/response';
import { validateProfileUpdate } from '@/services/backend/svc/profile';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      return jsonRes(res, { code: 405, message: 'method not allowed' });
    }

    const payload = await verifyAccessToken(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'invalid token' });

    const validation = validateProfileUpdate(req.body);
    if (!validation.success) {
      return jsonRes(res, { code: 400, message: validation.message });
    }

    const user = await globalPrisma.user.update({
      where: {
        uid: payload.userUid
      },
      data: validation.data,
      select: {
        uid: true,
        avatarUri: true,
        nickname: true,
        id: true,
        name: true,
        updatedAt: true
      }
    });

    return jsonRes(res, {
      code: 200,
      message: 'Successfully',
      data: {
        info: user
      }
    });
  } catch (err) {
    console.log(err);
    return jsonRes(res, {
      code: 500,
      message: 'Failed to update profile'
    });
  }
}
