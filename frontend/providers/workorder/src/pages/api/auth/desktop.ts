import { generateAccessToken, verifyDesktopToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { createUser, getUserById, updateUser } from '@/services/db/user';
import { AppSession } from '@/types/user';
import { NextApiRequest, NextApiResponse } from 'next';
import { omit } from 'lodash';

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
    const newPayload = omit(payload, ['iat', 'exp']);

    const existingUser = await getUserById(newPayload.userId);

    if (existingUser) {
      const temp = {
        workspaceId: payload.workspaceId,
        workspaceUid: payload.workspaceUid,
        regionUid: payload.regionUid,
        userCrUid: payload.userCrUid,
        userCrName: payload.userCrName
      };
      await updateUser(payload.userId, temp);

      const token = generateAccessToken(existingUser);
      return jsonRes<AppSession>(res, {
        code: 200,
        data: {
          token: token,
          user: { ...existingUser, ...temp }
        }
      });
    }

    await createUser({
      ...newPayload,
      isAdmin: false
    });

    const accessToken = generateAccessToken({
      ...newPayload,
      isAdmin: false
    });

    jsonRes<AppSession>(res, {
      code: 200,
      data: {
        token: accessToken,
        user: {
          ...newPayload,
          isAdmin: false
        }
      }
    });
  } catch (error) {
    jsonRes(res, { code: 500, error: error });
  }
}
