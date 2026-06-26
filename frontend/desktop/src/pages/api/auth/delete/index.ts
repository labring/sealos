import { NextApiRequest, NextApiResponse } from 'next';
import { filterAccessToken } from '@/services/backend/middleware/access';
import { ErrorHandler } from '@/services/backend/middleware/error';
import {
  otherRegionResourceGuard,
  resourceGuard
} from '@/services/backend/middleware/checkResource';
import { accountBalanceGuard } from '@/services/backend/middleware/amount';
import { deleteUserSvc } from '@/services/backend/svc/deleteUser';
import { isProtectedAdminUser, PROTECTED_ADMIN_USER_MESSAGE } from '@/utils/protectedUser';
import { jsonRes } from '@/services/backend/response';
export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  await filterAccessToken(req, res, async ({ userUid, userId, userCrName }) => {
    if (isProtectedAdminUser({ userId, userCrName })) {
      return jsonRes(res, { code: 403, message: PROTECTED_ADMIN_USER_MESSAGE });
    }

    await accountBalanceGuard(userUid)(res, async () => {
      await resourceGuard(userUid)(res, async () => {
        await otherRegionResourceGuard(userUid, userId)(res, async () => {
          await deleteUserSvc(userUid)(res);
        });
      });
    });
  });
});
