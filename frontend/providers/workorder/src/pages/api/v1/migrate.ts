import { NextApiRequest, NextApiResponse } from 'next';
import { migrateWorkOrders } from '@/services/db/workorder';
import { verify } from 'jsonwebtoken';
import { jsonRes } from '@/services/backend/response';
import { getUserById, updateUser } from '@/services/db/user';
import { desktopJwtSecret } from '@/services/backend/auth';

const verifyToken = (token: string) => {
  try {
    return verify(token, desktopJwtSecret) as { userUid: string; mergeUserUid: string };
  } catch (error) {
    throw new Error('Token verification failed');
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = req.body.token;
    if (!token) {
      return jsonRes(res, { code: 400, data: 'Invalid parameters' });
    }

    const { userUid, mergeUserUid } = verifyToken(token);

    if (!mergeUserUid || !userUid) {
      return jsonRes(res, { code: 400, data: 'Invalid user identifiers' });
    }

    const mergeUser = await getUserById(mergeUserUid);
    const targetUser = await getUserById(userUid);

    if (!mergeUser) {
      return jsonRes(res, { code: 200, data: 'Merge user not found, nothing to do' });
    }

    const migrationResult = await migrateWorkOrders({ mergeUserUid, userUid });
    if (!migrationResult.success) {
      return jsonRes(res, { code: 500, data: migrationResult.message });
    }

    if (!targetUser) {
      const updateResult = await updateUser(mergeUserUid, { userId: userUid });
      if (updateResult.matchedCount === 0) {
        return jsonRes(res, { code: 500, data: 'Failed to update user' });
      }
    }

    return jsonRes(res, { code: 200, data: 'Success' });
  } catch (error) {
    console.log('Error in migrate handler:', error);
    return jsonRes(res, { code: 500, data: error });
  }
}
