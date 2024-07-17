import { NextApiRequest, NextApiResponse } from 'next';
import { filterAccessToken } from '@/services/backend/middleware/access';
import { ErrorHandler } from '@/services/backend/middleware/error';
import {
  otherRegionResourceGuard,
  resourceGuard
} from '@/services/backend/middleware/checkResource';
import { accountBalanceGuard } from '@/services/backend/middleware/amount';
import { deleteUserSvc } from '@/services/backend/svc/deleteUser';
export default ErrorHandler(async function handler(req: NextApiRequest, res: NextApiResponse) {
  await filterAccessToken(req, res, async ({ userUid, userId, userCrName }) => {
    await accountBalanceGuard(userUid)(res, async () => {
      await resourceGuard(userUid)(res, async () => {
        await otherRegionResourceGuard(userUid, userId)(res, async () => {
          await deleteUserSvc(userUid)(res);
        });
      });
    });
  });
});
