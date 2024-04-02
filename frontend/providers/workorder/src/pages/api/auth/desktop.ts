import { generateAccessToken, verifyDesktopToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { createUser, getUserById } from '@/services/db/user';
import { AppSession } from '@/types/user';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { token } = req.body;
    const payload = await verifyDesktopToken(token);
    if (!payload) {
      return jsonRes(res, {
        code: 401,
        message: 'verify desktop token error'
      });
    }

    const existingUser = await getUserById(payload.userId);

    if (existingUser) {
      const token = generateAccessToken({
        userId: existingUser.userId,
        isAdmin: existingUser.isAdmin
      });
      return jsonRes<AppSession>(res, {
        code: 200,
        data: {
          token: token,
          user: {
            userId: existingUser.userId,
            isAdmin: existingUser.isAdmin
          }
        }
      });
    }

    await createUser({
      ...payload,
      isAdmin: false
    });

    const accessToken = generateAccessToken({
      userId: payload.userId,
      isAdmin: false
    });

    return jsonRes<AppSession>(res, {
      code: 200,
      data: {
        token: accessToken,
        user: {
          userId: payload.userId,
          isAdmin: false
        }
      }
    });
  } catch (error) {
    jsonRes(res, { code: 500, error: error });
  }
}
