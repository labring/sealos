import { filterAccessToken } from '@/services/backend/middleware/access';
import { filterForceDelete } from '@/services/backend/middleware/checkResource';
import { ErrorHandler } from '@/services/backend/middleware/error';
import { forceDeleteUserSvc } from '@/services/backend/svc/deleteUser';
import { isProtectedAdminUser, PROTECTED_ADMIN_USER_MESSAGE } from '@/utils/protectedUser';
import { jsonRes } from '@/services/backend/response';
import { NextApiRequest, NextApiResponse } from 'next';
export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  await filterAccessToken(req, res, async ({ userUid, userId, userCrName }) => {
    if (isProtectedAdminUser({ userId, userCrName })) {
      return jsonRes(res, { code: 403, message: PROTECTED_ADMIN_USER_MESSAGE });
    }

    await filterForceDelete(req, res, async ({ code }) => {
      await forceDeleteUserSvc(userUid, code)(res);
    });
  });
});
